import { GitHubApiError, githubGraphql, githubRest, paginate } from "./client";

/*
 * How owned repos gained stars and forks in the period. Both answers are counts over a date
 * range, which GitHub does not store as a number, so each needs its own walk.
 */

export function splitName(nameWithOwner: string): { owner: string; name: string } {
  const [owner = "", name = ""] = nameWithOwner.split("/");
  return { owner, name };
}

/** Stars per day (`YYYY-MM-DD`, days with none left out), newest week first. */
export interface StarDays {
  nameWithOwner: string;
  days: { date: string; count: number }[];
  complete: boolean;
}

interface StarWeek {
  /** Unix seconds of the week's Sunday. */
  week: number;
  days: number[];
}

const WEEKS_PER_PAGE = 30;
/** GitHub serves at most 100 pages of star history. */
const MAX_HISTORY_PAGES = 100;
const DAY_SECONDS = 86_400;

/**
 * Star history from `stargazers/history`: aggregate counts, readable with a public-only token
 * (the stargazer list needs admin or collaborator access since July 2026). A year is about two
 * requests. GitHub says its week and day boundaries may not align with UTC, so a star near
 * midnight can land on the neighbouring day. Removed stars are not in the history.
 *
 * Null when the token may not read the repository's history, so the caller can say unavailable.
 */
export async function fetchStarDays(
  token: string,
  nameWithOwner: string,
  fromIso: string,
  { deadline = Number.POSITIVE_INFINITY, now = Date.now }: Deadline = {},
): Promise<StarDays | null> {
  const { owner, name } = splitName(nameWithOwner);
  const fromDate = fromIso.slice(0, 10);
  const days: StarDays["days"] = [];
  for (let page = 1; page <= MAX_HISTORY_PAGES; page++) {
    if (now() >= deadline) return { nameWithOwner, days, complete: false };
    let weeks: StarWeek[];
    try {
      weeks = await githubRest<StarWeek[]>(
        token,
        `/repos/${owner}/${name}/stargazers/history?per_page=${WEEKS_PER_PAGE}&page=${page}`,
      );
    } catch (error) {
      if (error instanceof GitHubApiError && [401, 403, 404].includes(error.status)) return null;
      throw error;
    }
    let reachedStart = false;
    for (const week of weeks) {
      week.days.forEach((count, index) => {
        if (count > 0) days.push({ date: isoDay(week.week + index * DAY_SECONDS), count });
      });
      if (isoDay(week.week) <= fromDate) reachedStart = true;
    }
    if (reachedStart || weeks.length < WEEKS_PER_PAGE) {
      return { nameWithOwner, days, complete: true };
    }
  }
  return { nameWithOwner, days, complete: false };
}

interface Deadline {
  deadline?: number;
  now?: () => number;
}

export interface WalkLimits {
  /** Repos walked at the same time. */
  concurrency?: number;
  /** Time for all walks together; a walk still going when it runs out stops incomplete. */
  budgetMs?: number;
  now?: () => number;
}

/**
 * Star days for every repo, a few at a time under one budget. Pass repos most-starred first, so
 * the budget goes where the gains are: an account with a thousand repos would otherwise need two
 * thousand requests (sindresorhus: 318 s) and most of the public token's hourly REST quota.
 *
 * - A repo the budget did not reach, or whose history GitHub failed to serve (5xx), comes back
 *   empty and incomplete, so the gain is an estimate.
 * - Null when any repo is unreadable, GitHub refuses the history (422) or the rate limit is
 *   spent: a partial sum shown as the account's gain would be wrong, and unavailable is honest.
 */
export async function fetchStarHistories(
  token: string,
  repos: string[],
  fromIso: string,
  { concurrency = 4, budgetMs = 15_000, now = Date.now }: WalkLimits = {},
): Promise<StarDays[] | null> {
  const deadline = now() + budgetMs;
  try {
    const results = await mapWithLimit(repos, concurrency, async (repo) => {
      try {
        return await fetchStarDays(token, repo, fromIso, { deadline, now });
      } catch (error) {
        if (isServerError(error)) return { nameWithOwner: repo, days: [], complete: false };
        throw error;
      }
    });
    return results.every((result) => result !== null) ? results : null;
  } catch (error) {
    // 429: the rate limit is spent. 422: GitHub refuses the history ("validation failed, or the
    // endpoint has been spammed"). Neither says anything about the gain, so it is unavailable.
    if (error instanceof GitHubApiError && (error.status === 429 || error.status === 422)) {
      return null;
    }
    throw error;
  }
}

function isServerError(error: unknown): boolean {
  return error instanceof GitHubApiError && error.status >= 500;
}

function isoDay(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export interface ForkWalk {
  nameWithOwner: string;
  /** Newest first, fetched until they fall before the period, the page cap or the budget. */
  createdAt: string[];
  complete: boolean;
}

export interface ForkWalkOptions extends WalkLimits {
  /** Page cap per repo (100 forks per page). */
  maxPages?: number;
}

const FORKS_QUERY = /* GraphQL */ `
  query Forks($owner: String!, $name: String!, $after: String) {
    repository(owner: $owner, name: $name) {
      forks(first: 100, after: $after, orderBy: { field: CREATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes { createdAt }
      }
    }
  }
`;

/**
 * Fork creation dates per repo. GitHub has no fork history endpoint, and a page of forks on a
 * popular repo takes seconds to build, so walking repos one after another had no upper bound
 * (octocat: 75 s). Walks run a few at a time under one shared budget instead; whatever the
 * budget cuts off is reported incomplete, which makes the gain an estimate, never a wrong exact.
 * A page already in flight when the budget ends still finishes. Pass repos most-forked first.
 * A repo GitHub fails to serve (5xx; big fork lists do time out) is incomplete too.
 */
export async function fetchForkWalks(
  token: string,
  repos: string[],
  fromIso: string,
  { maxPages = 10, concurrency = 4, budgetMs = 20_000, now = Date.now }: ForkWalkOptions = {},
): Promise<ForkWalk[]> {
  const deadline = now() + budgetMs;
  return mapWithLimit(repos, concurrency, async (nameWithOwner): Promise<ForkWalk> => {
    const result = await paginate(
      async (after) => {
        const data = await githubGraphql<{
          repository: {
            forks: {
              pageInfo: { hasNextPage: boolean; endCursor: string | null };
              nodes: { createdAt: string }[];
            };
          };
        }>(token, FORKS_QUERY, { ...splitName(nameWithOwner), after });
        const connection = data.repository.forks;
        return {
          items: connection.nodes.map((node) => node.createdAt),
          pageInfo: connection.pageInfo,
        };
      },
      {
        maxPages,
        shouldContinue: (page) => (page.at(-1) ?? "") >= fromIso,
        deadline,
        now,
      },
    ).catch((error: unknown) => {
      if (isServerError(error)) return { items: [], complete: false };
      throw error;
    });
    return { nameWithOwner, createdAt: result.items, complete: result.complete };
  });
}

/** Maps with at most `limit` calls in flight; results keep the input order. */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
