import { githubGraphql } from "./client";

/**
 * One query for the year's contribution overview.
 * contributionsCollection spans at most one year; from/to are ISO datetimes.
 */
const CONTRIBUTIONS_QUERY = /* GraphQL */ `
  query Contributions($from: DateTime!, $to: DateTime!) {
    viewer {
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
        hasAnyRestrictedContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 100) {
          contributions {
            totalCount
          }
          repository {
            nameWithOwner
            isPrivate
            isFork
            stargazerCount
            forkCount
            createdAt
            owner {
              login
            }
            primaryLanguage {
              name
              color
            }
          }
        }
      }
    }
  }
`;

export interface RawContributions {
  viewer: {
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
      hasAnyRestrictedContributions: boolean;
      contributionCalendar: {
        totalContributions: number;
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
      commitContributionsByRepository: {
        contributions: { totalCount: number };
        repository: {
          nameWithOwner: string;
          isPrivate: boolean;
          isFork: boolean;
          stargazerCount: number;
          forkCount: number;
          createdAt: string;
          owner: { login: string };
          primaryLanguage: { name: string; color: string | null } | null;
        };
      }[];
    };
  };
}

export function fetchContributions(token: string, from: Date, to: Date) {
  return githubGraphql<RawContributions>(token, CONTRIBUTIONS_QUERY, {
    from: from.toISOString(),
    to: to.toISOString(),
  });
}
