import { githubGraphql, paginate } from "./client";

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
  pullRequestRepos: { nameWithOwner: string; ownerLogin: string }[];
  /** PR/issue details GitHub returned; may be fewer than `totals` when some are restricted. */
  pullRequests: { merged: boolean }[];
  issues: { closed: boolean }[];
  /** Non-fork repos owned by the user, as of fetch time. */
  ownedRepos: RepoFacts[];
  /** Newest-first timestamps, fetched until they fall before the period or the page cap hits. */
  stars: { nameWithOwner: string; starredAt: string[]; complete: boolean }[];
  forks: { nameWithOwner: string; createdAt: string[]; complete: boolean }[];
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
  /** Caps per repo for stargazer/fork pagination (100 per page). Beyond it the gain is a lower bound. */
  maxStarPages?: number;
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

const OVERVIEW_QUERY = /* GraphQL */ `
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
          repository { nameWithOwner owner { login } }
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
        repository: { nameWithOwner: string; owner: { login: string } };
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
 * per-repo pagination is needed. The quarters are aliased into one request.
 */
function commitReposQuery(ranges: { from: string; to: string }[]): string {
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

async function fetchCommitRepos(token: string, from: Date, to: Date) {
  const data = await githubGraphql<{
    viewer: Record<string, { commitContributionsByRepository: RawCommitRepo[] }>;
  }>(token, commitReposQuery(quarterRanges(from, to)));
  const byRepo = new Map<string, YearActivity["commitRepos"][number]>();
  for (const collection of Object.values(data.viewer)) {
    for (const entry of collection.commitContributionsByRepository) {
      if (entry.contributions.pageInfo.hasNextPage) {
        // Cannot happen with quarter-sized ranges; fail loudly rather than undercount.
        throw new Error(
          `More than 100 commit days in one quarter for ${entry.repository.nameWithOwner}`,
        );
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

const OWNED_REPOS_QUERY = /* GraphQL */ `
  query OwnedRepos($after: String) {
    viewer {
      repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false) {
        pageInfo { hasNextPage endCursor }
        nodes { ${REPO_FIELDS} }
      }
    }
  }
`;

const STARGAZERS_QUERY = /* GraphQL */ `
  query Stargazers($owner: String!, $name: String!, $after: String) {
    repository(owner: $owner, name: $name) {
      stargazers(first: 100, after: $after, orderBy: { field: STARRED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        edges { starredAt }
      }
    }
  }
`;

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

function splitName(nameWithOwner: string): { owner: string; name: string } {
  const [owner = "", name = ""] = nameWithOwner.split("/");
  return { owner, name };
}

/**
 * Fetches one user's activity in [from, to]. Requests run sequentially: a full sync is a few
 * dozen requests for typical accounts, and sequential calls keep secondary rate limits quiet.
 */
export async function fetchYearActivity(
  token: string,
  from: Date,
  to: Date,
  { maxStarPages = 10, commitSampleRepos = 5, maxCommitPages = 5 }: FetchOptions = {},
): Promise<YearActivity> {
  const range = { from: from.toISOString(), to: to.toISOString() };
  const fromIso = range.from;

  const overview = await githubGraphql<RawOverview>(token, OVERVIEW_QUERY, range);
  const { viewer } = overview;
  const collection = viewer.contributionsCollection;

  const commitRepos = await fetchCommitRepos(token, from, to);

  const pullRequests = await paginate(async (after) => {
    const data = await githubGraphql<{
      viewer: {
        contributionsCollection: {
          pullRequestContributions: Page<{ nodes: { pullRequest: { merged: boolean } | null }[] }>;
        };
      };
    }>(token, PULL_REQUESTS_QUERY, { ...range, after });
    const connection = data.viewer.contributionsCollection.pullRequestContributions;
    return {
      items: connection.nodes.flatMap((node) =>
        node.pullRequest ? [{ merged: node.pullRequest.merged }] : [],
      ),
      pageInfo: connection.pageInfo,
    };
  });

  const issues = await paginate(async (after) => {
    const data = await githubGraphql<{
      viewer: {
        contributionsCollection: {
          issueContributions: Page<{ nodes: { issue: { closed: boolean } | null }[] }>;
        };
      };
    }>(token, ISSUES_QUERY, { ...range, after });
    const connection = data.viewer.contributionsCollection.issueContributions;
    return {
      items: connection.nodes.flatMap((node) =>
        node.issue ? [{ closed: node.issue.closed }] : [],
      ),
      pageInfo: connection.pageInfo,
    };
  });

  const ownedRepos = await paginate(async (after) => {
    const data = await githubGraphql<{ viewer: { repositories: Page<{ nodes: RawRepo[] }> } }>(
      token,
      OWNED_REPOS_QUERY,
      { after },
    );
    return {
      items: data.viewer.repositories.nodes.map(toRepoFacts),
      pageInfo: data.viewer.repositories.pageInfo,
    };
  });

  const stars: YearActivity["stars"] = [];
  for (const repo of ownedRepos.items.filter((r) => r.stars > 0)) {
    const result = await paginate(
      async (after) => {
        const data = await githubGraphql<{
          repository: { stargazers: Page<{ edges: { starredAt: string }[] }> };
        }>(token, STARGAZERS_QUERY, { ...splitName(repo.nameWithOwner), after });
        const connection = data.repository.stargazers;
        return {
          items: connection.edges.map((edge) => edge.starredAt),
          pageInfo: connection.pageInfo,
        };
      },
      { maxPages: maxStarPages, shouldContinue: (page) => (page.at(-1) ?? "") >= fromIso },
    );
    stars.push({
      nameWithOwner: repo.nameWithOwner,
      starredAt: result.items,
      complete: result.complete,
    });
  }

  const forks: YearActivity["forks"] = [];
  for (const repo of ownedRepos.items.filter((r) => r.forks > 0)) {
    const result = await paginate(
      async (after) => {
        const data = await githubGraphql<{
          repository: { forks: Page<{ nodes: { createdAt: string }[] }> };
        }>(token, FORKS_QUERY, { ...splitName(repo.nameWithOwner), after });
        const connection = data.repository.forks;
        return {
          items: connection.nodes.map((node) => node.createdAt),
          pageInfo: connection.pageInfo,
        };
      },
      { maxPages: maxStarPages, shouldContinue: (page) => (page.at(-1) ?? "") >= fromIso },
    );
    forks.push({
      nameWithOwner: repo.nameWithOwner,
      createdAt: result.items,
      complete: result.complete,
    });
  }

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
    })),
    pullRequests: pullRequests.items,
    issues: issues.items,
    ownedRepos: ownedRepos.items,
    stars,
    forks,
    commitSample: { authoredAt, reposSampled: sampledRepos.length, complete: sampleComplete },
  };
}
