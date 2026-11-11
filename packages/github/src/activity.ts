import { walkFromBothEnds } from "./both-ends";
import { GitHubApiError, githubGraphql, paginate } from "./client";
import {
  type ForkWalk,
  fetchForkWalks,
  fetchStarHistories,
  type StarDays,
  splitName,
} from "./community";
import { type Subject, subjectVariables, withSubject } from "./subject";

/**
 * Everything analytics needs for one user's year, flattened out of GitHub's GraphQL shapes.
 * Raw API types stay in this file; `buildRecap` in @wyg/analytics declares a structurally
 * identical input type, so the compiler checks the seam wherever the two are wired together.
 */
export interface YearActivity {
  viewer: { id: string; login: string; name: string | null; avatarUrl: string };
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
  /** Repos the user committed to in the period, with their commit count (summed per day). */
  commitRepos: { repo: RepoFacts; commits: number; languages: LanguageBytes }[];
  /** Repos the user opened PRs in, with how many PRs (one contribution per PR). */
  pullRequestRepos: {
    nameWithOwner: string;
    ownerLogin: string;
    isPrivate: boolean;
    pullRequests: number;
  }[];
  /** PR/issue details GitHub returned; may be fewer than `totals` when some are restricted. */
  pullRequests: { merged: boolean }[];
  issues: { closed: boolean }[];
  /** Non-fork repos owned by the user, as of fetch time. */
  ownedRepos: RepoFacts[];
  /**
   * Stars per day from GitHub's star history. Null when the token may not read some repo's
   * history, so the gain is unavailable rather than a partial sum.
   */
  stars: StarDays[] | null;
  /** Newest-first fork dates, fetched until they fall before the period, the page cap or the budget. */
  forks: ForkWalk[];
  /**
   * Repositories the viewer starred, newest first, down to the start of the period. `complete` is
   * false when the page cap stopped the walk first. Null when GitHub refused the listing.
   */
  starred: { items: { starredAt: string; repo: RepoFacts }[]; complete: boolean } | null;
  /** Authored timestamps of the user's commits on default branches of their top repos. */
  commitSample: { authoredAt: string[]; reposSampled: number; complete: boolean };
}

export interface RepoFacts {
  nameWithOwner: string;
  ownerLogin: string;
  isPrivate: boolean;
  isFork: boolean;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  createdAt: string;
}

export interface LanguageBytes {
  totalSize: number;
  edges: { name: string; color: string | null; size: number }[];
}

export interface FetchOptions {
  /** Page cap per repo for fork and starred-repo pagination (100 per page). Beyond it the count is a lower bound. */
  maxStarPages?: number;
  /** Time for all star-history and all fork walks (see fetchStarHistories, fetchForkWalks). */
  starBudgetMs?: number;
  forkBudgetMs?: number;
  /** How many top repos to sample commit timestamps from, and page cap per repo. */
  commitSampleRepos?: number;
  maxCommitPages?: number;
}

const REPO_FIELDS = /* GraphQL */ `
  nameWithOwner
  isPrivate
  isFork
  stargazerCount
  forkCount
  createdAt
  owner { login }
  primaryLanguage { name }
`;

interface RawRepo {
  nameWithOwner: string;
  isPrivate: boolean;
  isFork: boolean;
  stargazerCount: number;
  forkCount: number;
  createdAt: string;
  owner: { login: string };
  primaryLanguage: { name: string } | null;
}

const toRepoFacts = (repo: RawRepo): RepoFacts => ({
  nameWithOwner: repo.nameWithOwner,
  ownerLogin: repo.owner.login,
  isPrivate: repo.isPrivate,
  isFork: repo.isFork,
  primaryLanguage: repo.primaryLanguage?.name ?? null,
  stars: repo.stargazerCount,
  forks: repo.forkCount,
  createdAt: repo.createdAt,
});

export const OVERVIEW_QUERY = /* GraphQL */ `
  query Overview($from: DateTime!, $to: DateTime!) {
    viewer {
      id
      login
      name
      avatarUrl
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoriesWithContributedCommits
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
        pullRequestContributionsByRepository(maxRepositories: 100) {
          contributions { totalCount }
          repository { nameWithOwner isPrivate owner { login } }
        }
      }
    }
  }
`;

interface RawOverview {
  viewer: {
    id: string;
    login: string;
    name: string | null;
    avatarUrl: string;
    contributionsCollection: {
      totalCommitContributions: number;
      totalIssueContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      totalRepositoriesWithContributedCommits: number;
      restrictedContributionsCount: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
      pullRequestContributionsByRepository: {
        contributions: { totalCount: number };
        repository: { nameWithOwner: string; isPrivate: boolean; owner: { login: string } };
      }[];
    };
  };
}

interface RawCommitRepo {
  repository: RawRepo & {
    languages: {
      totalSize: number;
      edges: { size: number; node: { name: string; color: string | null } }[];
    };
  };
  contributions: { pageInfo: { hasNextPage: boolean }; nodes: { commitCount: number }[] };
}

/**
 * Per-repo commit contributions come as one node per (repo, day), and a connection is capped at
 * 100 nodes. Querying each quarter separately keeps every connection under 92 nodes, so no
 * per-repo pagination is needed. Each quarter is its own request: aliased into one, a heavy
 * account's query often passed GitHub's ~10 s limit and failed with 502 or 504.
 */
export function commitReposQuery(ranges: { from: string; to: string }[]): string {
  const collections = ranges.map(
    (range, index) => /* GraphQL */ `
      q${index}: contributionsCollection(from: "${range.from}", to: "${range.to}") {
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
            ${REPO_FIELDS}
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              totalSize
              edges { size node { name color } }
            }
          }
          contributions(first: 100) { pageInfo { hasNextPage } nodes { commitCount } }
        }
      }`,
  );
  return `query CommitRepos { viewer { ${collections.join("\n")} } }`;
}

/** Splits [from, to] at calendar-quarter boundaries (UTC). */
export function quarterRanges(from: Date, to: Date): { from: string; to: string }[] {
  const ranges: { from: string; to: string }[] = [];
  let start = from;
  while (start <= to) {
    const quarterEnd = new Date(
      Date.UTC(start.getUTCFullYear(), Math.floor(start.getUTCMonth() / 3) * 3 + 3, 1) - 1000,
    );
    const end = quarterEnd < to ? quarterEnd : to;
    ranges.push({ from: start.toISOString(), to: end.toISOString() });
    start = new Date(end.getTime() + 1000);
  }
  return ranges;
}

async function fetchCommitRepos(token: string, from: Date, to: Date, subject: Subject) {
  const quarters = await Promise.all(
    quarterRanges(from, to).map((range) =>
      githubGraphql<{
        viewer: Record<string, { commitContributionsByRepository: RawCommitRepo[] }>;
      }>(token, withSubject(commitReposQuery([range]), subject), subjectVariables(subject)),
    ),
  );
  const byRepo = new Map<string, YearActivity["commitRepos"][number]>();
  for (const collection of quarters.flatMap((data) => Object.values(data.viewer))) {
    for (const entry of collection.commitContributionsByRepository) {
      if (entry.contributions.pageInfo.hasNextPage) {
        // Cannot happen with quarter-sized ranges; fail loudly rather than undercount. The message
        // carries no repo name: it may be private and errors end up in logs.
        throw new Error("More than 100 commit days for one repository in one quarter");
      }
      const commits = entry.contributions.nodes.reduce((sum, node) => sum + node.commitCount, 0);
      const existing = byRepo.get(entry.repository.nameWithOwner);
      if (existing) {
        existing.commits += commits;
        continue;
      }
      const { languages } = entry.repository;
      byRepo.set(entry.repository.nameWithOwner, {
        repo: toRepoFacts(entry.repository),
        commits,
        languages: {
          totalSize: languages.totalSize,
          edges: languages.edges.map((edge) => ({
            name: edge.node.name,
            color: edge.node.color,
            size: edge.size,
          })),
        },
      });
    }
  }
  return [...byRepo.values()];
}

const PULL_REQUESTS_QUERY = /* GraphQL */ `
  query PullRequests($from: DateTime!, $to: DateTime!, $after: String) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        pullRequestContributions(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { pullRequest { merged } }
        }
      }
    }
  }
`;

const ISSUES_QUERY = /* GraphQL */ `
  query Issues($from: DateTime!, $to: DateTime!, $after: String) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        issueContributions(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { issue { closed } }
        }
      }
    }
  }
`;

export const OWNED_REPOS_QUERY = /* GraphQL */ `
  query OwnedRepos($after: String, $direction: OrderDirection!) {
    viewer {
      repositories(
        first: 100
        after: $after
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: CREATED_AT, direction: $direction }
      ) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { ${REPO_FIELDS} }
      }
    }
  }
`;

const STARRED_QUERY = /* GraphQL */ `
  query Starred($after: String) {
    viewer {
      starredRepositories(first: 100, after: $after, orderBy: { field: STARRED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        edges { starredAt node { ${REPO_FIELDS} } }
      }
    }
  }
`;

const COMMIT_HISTORY_QUERY = /* GraphQL */ `
  query CommitHistory(
    $owner: String!
    $name: String!
    $author: ID!
    $since: GitTimestamp!
    $until: GitTimestamp!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, after: $after, author: { id: $author }, since: $since, until: $until) {
              pageInfo { hasNextPage endCursor }
              nodes { authoredDate }
            }
          }
        }
      }
    }
  }
`;

type Page<T> = { pageInfo: { hasNextPage: boolean; endCursor: string | null } } & T;

function isForbidden(error: unknown): boolean {
  return (
    error instanceof GitHubApiError &&
    Array.isArray(error.details) &&
    error.details.some((detail: { type?: string }) => detail.type === "FORBIDDEN")
  );
}

/**
 * Fetches one user's activity in [from, to]. The independent parts (overview, commit repos and
 * their sample, PRs, issues, owned repos and their star and fork walks, starred repos) run side by
 * side; inside each part, pages follow one another. For a heavy account each part takes tens of
 * seconds, so in sequence they summed past the public route's 120 s limit (sindresorhus: 95 s
 * with only the walks parallel). At most about a dozen requests are in flight, well inside
 * GitHub's secondary rate limits.
 */
export async function fetchYearActivity(
  token: string,
  from: Date,
  to: Date,
  {
    maxStarPages = 10,
    commitSampleRepos = 5,
    maxCommitPages = 5,
    starBudgetMs = 15_000,
    forkBudgetMs = 20_000,
  }: FetchOptions = {},
  subject: Subject = { kind: "viewer" },
): Promise<YearActivity> {
  const range = { from: from.toISOString(), to: to.toISOString() };
  const fromIso = range.from;

  const overviewP = githubGraphql<RawOverview>(token, withSubject(OVERVIEW_QUERY, subject), {
    ...range,
    ...subjectVariables(subject),
  });
  const commitReposP = fetchCommitRepos(token, from, to, subject);

  const pullRequestsP = paginate(async (after) => {
    const data = await githubGraphql<{
      viewer: {
        contributionsCollection: {
          pullRequestContributions: Page<{ nodes: { pullRequest: { merged: boolean } | null }[] }>;
        };
      };
    }>(token, withSubject(PULL_REQUESTS_QUERY, subject), {
      ...range,
      after,
      ...subjectVariables(subject),
    });
    const connection = data.viewer.contributionsCollection.pullRequestContributions;
    return {
      items: connection.nodes.flatMap((node) =>
        node.pullRequest ? [{ merged: node.pullRequest.merged }] : [],
      ),
      pageInfo: connection.pageInfo,
    };
  });

  const issuesP = paginate(async (after) => {
    const data = await githubGraphql<{
      viewer: {
        contributionsCollection: {
          issueContributions: Page<{ nodes: { issue: { closed: boolean } | null }[] }>;
        };
      };
    }>(token, withSubject(ISSUES_QUERY, subject), {
      ...range,
      after,
      ...subjectVariables(subject),
    });
    const connection = data.viewer.contributionsCollection.issueContributions;
    return {
      items: connection.nodes.flatMap((node) =>
        node.issue ? [{ closed: node.issue.closed }] : [],
      ),
      pageInfo: connection.pageInfo,
    };
  });

  const ownedP = (async () => {
    const ownedRepos = {
      items: await walkFromBothEnds(
        async (direction, after) => {
          const data = await githubGraphql<{
            viewer: { repositories: Page<{ nodes: RawRepo[]; totalCount: number }> };
          }>(token, withSubject(OWNED_REPOS_QUERY, subject), {
            after,
            direction,
            ...subjectVariables(subject),
          });
          const { repositories } = data.viewer;
          return {
            items: repositories.nodes.map(toRepoFacts),
            pageInfo: repositories.pageInfo,
            totalCount: repositories.totalCount,
          };
        },
        (repo) => repo.nameWithOwner,
      ),
    };
    // Each walk has its own time budget. Most-starred and most-forked repos go first: that is
    // where a budget cut costs least.
    const byDesc = (key: "stars" | "forks") =>
      ownedRepos.items
        .filter((repo) => repo[key] > 0)
        .sort((a, b) => b[key] - a[key])
        .map((repo) => repo.nameWithOwner);
    const [stars, forks] = await Promise.all([
      fetchStarHistories(token, byDesc("stars"), fromIso, { budgetMs: starBudgetMs }),
      fetchForkWalks(token, byDesc("forks"), fromIso, {
        maxPages: maxStarPages,
        budgetMs: forkBudgetMs,
      }),
    ]);
    return { ownedRepos, stars, forks };
  })();

  // Newest first, so the walk stops as soon as a page reaches back before the period.
  const starredP: Promise<YearActivity["starred"]> = paginate(
    async (after) => {
      const data = await githubGraphql<{
        viewer: {
          starredRepositories: Page<{ edges: { starredAt: string; node: RawRepo }[] }>;
        };
      }>(token, withSubject(STARRED_QUERY, subject), {
        after,
        ...subjectVariables(subject),
      });
      const connection = data.viewer.starredRepositories;
      return {
        items: connection.edges.map((edge) => ({
          starredAt: edge.starredAt,
          repo: toRepoFacts(edge.node),
        })),
        pageInfo: connection.pageInfo,
      };
    },
    {
      maxPages: maxStarPages,
      shouldContinue: (page) => (page.at(-1)?.starredAt ?? "") >= fromIso,
    },
  ).catch((error: unknown) => {
    if (isForbidden(error)) return null;
    throw error;
  });

  // The sample needs the user's id (overview) and their busiest repos (commit repos).
  const sampleP = (async () => {
    const [{ viewer }, commitRepos] = await Promise.all([overviewP, commitReposP]);
    const sampledRepos = [...commitRepos]
      .sort((a, b) => b.commits - a.commits)
      .slice(0, commitSampleRepos);
    const authoredAt: string[] = [];
    let sampleComplete = true;
    for (const { repo } of sampledRepos) {
      const result = await paginate(
        async (after) => {
          const data = await githubGraphql<{
            repository: {
              defaultBranchRef: {
                target: { history?: Page<{ nodes: { authoredDate: string }[] }> };
              } | null;
            } | null;
          }>(token, COMMIT_HISTORY_QUERY, {
            ...splitName(repo.nameWithOwner),
            author: viewer.id,
            since: range.from,
            until: range.to,
            after,
          });
          const history = data.repository?.defaultBranchRef?.target.history;
          if (!history) return { items: [], pageInfo: { hasNextPage: false, endCursor: null } };
          return {
            items: history.nodes.map((node) => node.authoredDate),
            pageInfo: history.pageInfo,
          };
        },
        { maxPages: maxCommitPages },
      );
      authoredAt.push(...result.items);
      sampleComplete &&= result.complete;
    }
    return { authoredAt, sampleComplete, reposSampled: sampledRepos.length };
  })();

  const [
    { viewer },
    commitRepos,
    pullRequests,
    issues,
    { ownedRepos, stars, forks },
    starred,
    { authoredAt, sampleComplete, reposSampled },
  ] = await Promise.all([
    overviewP,
    commitReposP,
    pullRequestsP,
    issuesP,
    ownedP,
    starredP,
    sampleP,
  ]);
  const collection = viewer.contributionsCollection;

  return {
    viewer: { id: viewer.id, login: viewer.login, name: viewer.name, avatarUrl: viewer.avatarUrl },
    totals: {
      contributions: collection.contributionCalendar.totalContributions,
      commits: collection.totalCommitContributions,
      issues: collection.totalIssueContributions,
      pullRequests: collection.totalPullRequestContributions,
      reviews: collection.totalPullRequestReviewContributions,
      reposWithCommits: collection.totalRepositoriesWithContributedCommits,
      restricted: collection.restrictedContributionsCount,
    },
    calendar: collection.contributionCalendar.weeks.flatMap((week) =>
      week.contributionDays.map((day) => ({ date: day.date, count: day.contributionCount })),
    ),
    commitRepos,
    pullRequestRepos: collection.pullRequestContributionsByRepository.map((entry) => ({
      nameWithOwner: entry.repository.nameWithOwner,
      ownerLogin: entry.repository.owner.login,
      isPrivate: entry.repository.isPrivate,
      pullRequests: entry.contributions.totalCount,
    })),
    pullRequests: pullRequests.items,
    issues: issues.items,
    ownedRepos: ownedRepos.items,
    stars,
    forks,
    starred,
    commitSample: { authoredAt, reposSampled, complete: sampleComplete },
  };
}

const PREVIOUS_YEAR_QUERY = /* GraphQL */ `
  query PreviousYear($from: DateTime!, $to: DateTime!, $spanTo: DateTime!) {
    viewer {
      full: contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
      span: contributionsCollection(from: $from, to: $spanTo) {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoriesWithContributedCommits
        restrictedContributionsCount
        contributionCalendar { totalContributions }
      }
    }
  }
`;

interface RawPreviousYear {
  viewer: {
    full: {
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
    };
    span: {
      totalCommitContributions: number;
      totalIssueContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      totalRepositoriesWithContributedCommits: number;
      restrictedContributionsCount: number;
      contributionCalendar: { totalContributions: number };
    };
  };
}

export interface PreviousYearActivity {
  year: number;
  /** All of last year, day by day. */
  calendar: { date: string; count: number }[];
  /** Totals from 1 January to `spanTo` last year. */
  span: YearActivity["totals"] & { through: string };
}

/**
 * Last year's counts for comparison, in one request: the full calendar, plus the totals from
 * 1 January to `spanTo` (the same day of the year as the current recap). The token sees the same
 * kinds of data as for this year, so the two years compare like for like.
 */
export async function fetchPreviousYear(
  token: string,
  year: number,
  spanTo: Date,
  subject: Subject = { kind: "viewer" },
): Promise<PreviousYearActivity> {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const data = await githubGraphql<RawPreviousYear>(
    token,
    withSubject(PREVIOUS_YEAR_QUERY, subject),
    {
      ...subjectVariables(subject),
      from: from.toISOString(),
      to: to.toISOString(),
      spanTo: spanTo.toISOString(),
    },
  );
  const { full, span } = data.viewer;
  return {
    year,
    calendar: full.contributionCalendar.weeks.flatMap((week) =>
      week.contributionDays.map((day) => ({ date: day.date, count: day.contributionCount })),
    ),
    span: {
      through: spanTo.toISOString().slice(0, 10),
      contributions: span.contributionCalendar.totalContributions,
      commits: span.totalCommitContributions,
      issues: span.totalIssueContributions,
      pullRequests: span.totalPullRequestContributions,
      reviews: span.totalPullRequestReviewContributions,
      reposWithCommits: span.totalRepositoriesWithContributedCommits,
      restricted: span.restrictedContributionsCount,
    },
  };
}
