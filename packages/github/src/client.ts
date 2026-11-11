const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/** Gateway errors: GitHub stopped a query at its ~10 s limit. The same query often passes next. */
const RETRIED_STATUSES = new Set([502, 503, 504]);

/**
 * Minimal GraphQL client. Server-side only: the token must never reach the browser.
 * Each user's own token is used, so rate limits (5,000 points/hour) are per user.
 * A gateway error is retried once: heavy accounts' queries hover near GitHub's time limit, and
 * one timeout should not fail a whole recap.
 */
export async function githubGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
  { retryDelayMs = 1_000 }: { retryDelayMs?: number } = {},
): Promise<T> {
  try {
    return await graphqlOnce<T>(token, query, variables);
  } catch (error) {
    if (!(error instanceof GitHubApiError) || !RETRIED_STATUSES.has(error.status)) throw error;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    return graphqlOnce<T>(token, query, variables);
  }
}

async function graphqlOnce<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "wrapyourgit",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json().catch(() => null)) as {
    data?: T;
    errors?: { message: string }[];
  } | null;

  if (!response.ok || !body || body.errors?.length) {
    const message = body?.errors?.map((e) => e.message).join("; ") ?? response.statusText;
    throw new GitHubApiError(message, response.status, body?.errors);
  }
  return body.data as T;
}

/**
 * One REST GET (`path` starts with "/"). Same server-only rule as githubGraphql. A failure throws
 * GitHubApiError with the HTTP status; a 403 whose rate limit is spent becomes 429, so callers
 * can tell "you may not" from "not right now".
 */
export async function githubRest<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "wrapyourgit",
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const spent = response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";
    throw new GitHubApiError(
      body?.message ?? response.statusText,
      spent ? 429 : response.status,
      body,
    );
  }
  return (await response.json()) as T;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Walks a cursor connection page by page. `fetchPage` returns the items and pageInfo for one page;
 * `shouldContinue` lets callers stop early (e.g. once results fall before the period).
 * `complete` is false when the page cap, or the `deadline` (checked against `now()` before each
 * page), stopped us before the connection was exhausted.
 */
export async function paginate<T>(
  fetchPage: (after: string | null) => Promise<{ items: T[]; pageInfo: PageInfo }>,
  {
    maxPages = Number.POSITIVE_INFINITY,
    shouldContinue = () => true,
    deadline = Number.POSITIVE_INFINITY,
    now = Date.now,
  }: {
    maxPages?: number;
    shouldContinue?: (page: T[]) => boolean;
    deadline?: number;
    now?: () => number;
  } = {},
): Promise<{ items: T[]; complete: boolean }> {
  const items: T[] = [];
  let after: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    if (now() >= deadline) return { items, complete: false };
    const result = await fetchPage(after);
    items.push(...result.items);
    if (!result.pageInfo.hasNextPage || !shouldContinue(result.items)) {
      return { items, complete: true };
    }
    after = result.pageInfo.endCursor;
  }
  return { items, complete: false };
}
