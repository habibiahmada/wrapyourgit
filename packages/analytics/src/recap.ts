import { type Metric, type RecapData, type RepoRef, SCHEMA_VERSION } from "@wyg/schema";
import { busiestMonth, countActiveDays, longestStreak, monthlyTotals } from "./calendar";

/**
 * One user's year as fetched by `fetchYearActivity` in @wyg/github. Declared here (not imported)
 * so analytics stays free of the GitHub client; TypeScript checks the two shapes match wherever
 * the fetch result is passed to `buildRecap`.
 */
export interface ActivityInput {
  viewer: { login: string; name: string | null; avatarUrl: string };
  totals: {
    contributions: number;
    commits: number;
    issues: number;
    pullRequests: number;
    reviews: number;
    reposWithCommits: number;
    restricted: number;
  };
  calendar: { date: string; count: number }[];
  commitRepos: { repo: RepoInput; commits: number; languages: LanguageInput }[];
  pullRequestRepos: { nameWithOwner: string; ownerLogin: string }[];
  pullRequests: { merged: boolean }[];
  issues: { closed: boolean }[];
  ownedRepos: RepoInput[];
  stars: { nameWithOwner: string; starredAt: string[]; complete: boolean }[];
  forks: { nameWithOwner: string; createdAt: string[]; complete: boolean }[];
  commitSample: { authoredAt: string[]; reposSampled: number; complete: boolean };
}

interface RepoInput {
  nameWithOwner: string;
  ownerLogin: string;
  isPrivate: boolean;
  isFork: boolean;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  createdAt: string;
}

interface LanguageInput {
  totalSize: number;
  edges: { name: string; color: string | null; size: number }[];
}

export interface BuildOptions {
  year: number;
  /** IANA timezone from the user's browser; days and hours are bucketed in it. */
  timezone: string;
  /** Sync time. Passed in so the function stays pure and testable. */
  now: Date;
}

const TOP_REPOS = 5;
const TOP_LANGUAGES = 5;
/** Languages below this share don't count towards `distinctCount` (metrics.md). */
const DISTINCT_LANGUAGE_MIN_SHARE = 0.01;

export function buildRecap(input: ActivityInput, { year, timezone, now }: BuildOptions): RecapData {
  const periodStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const today = localDate(now, timezone);
  // biome-ignore lint/complexity/useMathMinMax: ISO date strings, Math.min would coerce to NaN
  const periodEnd = today < yearEnd ? today : yearEnd;
  const inPeriod = (iso: string) => {
    const date = iso.slice(0, 10);
    return date >= periodStart && date <= periodEnd;
  };

  const calendar = input.calendar.filter((day) => inPeriod(day.date));
  const languages = languageShares(input.commitRepos);
  const ownedRepos = input.ownedRepos.filter((repo) => !repo.isFork);
  const reposCreated = ownedRepos.filter((repo) => inPeriod(repo.createdAt));

  return {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      year,
      periodStart,
      periodEnd,
      isFinal: today > yearEnd,
      generatedAt: now.toISOString(),
      timezone,
    },
    profile: {
      login: input.viewer.login,
      name: input.viewer.name,
      avatarUrl: input.viewer.avatarUrl,
    },
    contributions: {
      total: input.totals.contributions,
      commits: input.totals.commits,
      privateCount: ok(input.totals.restricted),
      activeDays: countActiveDays(calendar),
      longestStreak: longestStreak(calendar),
      busiestMonth: busiestMonth(calendar),
      monthly: monthlyTotals(calendar),
      weekday: weekdayTotals(calendar),
      hourly: hourlyCommits(input.commitSample, timezone),
      calendar,
    },
    languages: {
      top: languages.slice(0, TOP_LANGUAGES),
      distinctCount: languages.filter((l) => l.share >= DISTINCT_LANGUAGE_MIN_SHARE).length,
    },
    repositories: {
      ownedTotal: ownedRepos.length,
      contributedTo: input.totals.reposWithCommits,
      createdThisYear: reposCreated.length,
      top: [...input.commitRepos]
        .sort((a, b) => b.commits - a.commits)
        .slice(0, TOP_REPOS)
        .map((entry) => ({ ...toRepoRef(entry.repo), commits: entry.commits })),
    },
    community: {
      totalStars: sum(ownedRepos.map((repo) => repo.stars)),
      starsGained: countGained(
        input.stars.map((s) => ({ dates: s.starredAt, complete: s.complete })),
        inPeriod,
      ),
      totalForks: sum(ownedRepos.map((repo) => repo.forks)),
      forksGained: countGained(
        input.forks.map((f) => ({ dates: f.createdAt, complete: f.complete })),
        inPeriod,
      ),
      mostStarred: maxBy(ownedRepos, (repo) => repo.stars),
      mostStarredNew: maxBy(reposCreated, (repo) => repo.stars),
      mostForked: maxBy(ownedRepos, (repo) => repo.forks),
    },
    engineering: {
      prsOpened: input.totals.pullRequests,
      prsMerged: countDetailed(input.pullRequests, input.totals.pullRequests, (pr) => pr.merged),
      issuesOpened: input.totals.issues,
      issuesClosed: countDetailed(input.issues, input.totals.issues, (issue) => issue.closed),
      reviews: input.totals.reviews,
      externalRepos: countExternalRepos(input),
    },
    // Archetypes are M3: thresholds get tuned against real accounts first.
    identity: { archetype: null, scores: {}, reasons: [] },
  };
}

/**
 * Each repo contributes `userCommits × bytes(lang) / totalBytes`, so a huge repo the user touched
 * once doesn't outweigh their daily driver. Sorted by share, descending.
 */
export function languageShares(
  repos: readonly { commits: number; languages: LanguageInput }[],
): { name: string; color: string | null; share: number }[] {
  const weights = new Map<string, { color: string | null; weight: number }>();
  for (const { commits, languages } of repos) {
    if (languages.totalSize === 0 || commits === 0) continue;
    for (const edge of languages.edges) {
      const entry = weights.get(edge.name) ?? { color: edge.color, weight: 0 };
      entry.weight += (commits * edge.size) / languages.totalSize;
      weights.set(edge.name, entry);
    }
  }
  const total = sum([...weights.values()].map((entry) => entry.weight));
  return [...weights.entries()]
    .map(([name, entry]) => ({ name, color: entry.color, share: entry.weight / total }))
    .sort((a, b) => b.share - a.share);
}

/** Commits per local hour. Only default branches of the top repos are sampled, so always estimated. */
export function hourlyCommits(
  sample: ActivityInput["commitSample"],
  timezone: string,
): Metric<number[]> {
  if (sample.authoredAt.length === 0) {
    return { status: "unavailable", reason: "No commits found on default branches of top repos" };
  }
  const hourFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  });
  const hours = Array<number>(24).fill(0);
  for (const iso of sample.authoredAt) {
    const hour = Number(hourFormat.format(new Date(iso)));
    hours[hour] = (hours[hour] ?? 0) + 1;
  }
  return { status: "ok", value: hours, estimated: true };
}

function weekdayTotals(calendar: readonly { date: string; count: number }[]): number[] {
  const days = Array<number>(7).fill(0);
  for (const day of calendar) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    days[weekday] = (days[weekday] ?? 0) + day.count;
  }
  return days;
}

/**
 * Stars/forks gained: events dated inside the period. A walk stopped by the page cap only saw the
 * newest events, so the sum is a lower bound and marked estimated.
 */
function countGained(
  walks: { dates: string[]; complete: boolean }[],
  inPeriod: (iso: string) => boolean,
): Metric<number> {
  return {
    status: "ok",
    value: sum(walks.map((walk) => walk.dates.filter(inPeriod).length)),
    estimated: walks.some((walk) => !walk.complete),
  };
}

/**
 * Counts details (merged PRs, closed issues). GitHub omits restricted items from the detail
 * list, so when it returned fewer than the total the count covers only what we could see.
 */
function countDetailed<T>(
  details: readonly T[],
  total: number,
  predicate: (item: T) => boolean,
): Metric<number> {
  if (total === 0) return ok(0);
  if (details.length === 0) {
    return { status: "unavailable", reason: "GitHub returned no details for these contributions" };
  }
  return {
    status: "ok",
    value: details.filter(predicate).length,
    estimated: details.length < total,
  };
}

function countExternalRepos(input: ActivityInput): number {
  const login = input.viewer.login.toLowerCase();
  const external = new Set<string>();
  for (const { repo } of input.commitRepos) {
    if (repo.ownerLogin.toLowerCase() !== login) external.add(repo.nameWithOwner);
  }
  for (const repo of input.pullRequestRepos) {
    if (repo.ownerLogin.toLowerCase() !== login) external.add(repo.nameWithOwner);
  }
  return external.size;
}

/** Highest-scoring repo, or null when every score is 0 ("most starred" of zero stars is noise). */
function maxBy(repos: readonly RepoInput[], score: (repo: RepoInput) => number): RepoRef | null {
  let best: RepoInput | null = null;
  for (const repo of repos) {
    if (score(repo) > 0 && (best === null || score(repo) > score(best))) best = repo;
  }
  return best && toRepoRef(best);
}

function toRepoRef(repo: RepoInput): RepoRef {
  return {
    nameWithOwner: repo.nameWithOwner,
    isPrivate: repo.isPrivate,
    isFork: repo.isFork,
    primaryLanguage: repo.primaryLanguage,
    stars: repo.stars,
    forks: repo.forks,
    createdAt: repo.createdAt,
  };
}

/** YYYY-MM-DD of `date` as seen in `timezone`. */
function localDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

const ok = <T>(value: T): Metric<T> => ({ status: "ok", value, estimated: false });
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
