# Metric definitions

Every number shown anywhere must be defined here. Field names refer to `RecapData` in `packages/schema/src/recap.ts`.

**Feasibility:** ✅ direct from API · 🟡 computed / estimated, label it · ❓ verify in Spike A

## Global rules

- **Period:** `meta.periodStart` = Jan 1 of the edition year; `meta.periodEnd` = Dec 31, or the sync date if earlier (then `isFinal = false` and the UI says "so far").
- **Timezone:** days and hours are bucketed in the user's timezone (`meta.timezone`, from the browser at sync). Timestamps are stored in UTC. ❓ The calendar's daily buckets come from GitHub and we cannot re-bucket them. Spike A: the API calendar and the logged-out profile graph had the same yearly total, but 12 of 308 days differed by ±1 (a contribution moved to the neighbouring day), so `activeDays` was 161 vs 163 on github.com. Which timezone each side uses is still open. Star/fork/repo-creation dates are compared by their UTC date.
- **Unavailable ≠ 0:** if the API doesn't provide a value, use `{ status: "unavailable", reason }`.
- **Dedupe** by GitHub node ID.
- **Forks** are not counted as the user's own projects (`repositories.ownedTotal`, community stats).
- **Contributions ≠ commits.** Never sum categories and call it commits.

## Contributions

| Field                               | Definition                                                                                                                             | Source                                                                                                                                                                                                       |                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `contributions.total`               | Contributions GitHub counted in the period (commits, issues, PRs, reviews, repo creations, incl. private count if the user exposes it) | `contributionCalendar.totalContributions`                                                                                                                                                                    | ✅                            |
| `contributions.commits`             | Commit contributions attributed to the user                                                                                            | `totalCommitContributions`                                                                                                                                                                                   | ✅                            |
| `contributions.privateCount`        | Contributions to private repos (count only)                                                                                            | `restrictedContributionsCount`                                                                                                                                                                               | ✅ / ❓ with GitHub App token |
| `contributions.calendar`            | One entry per day in period                                                                                                            | `contributionCalendar.weeks[].contributionDays[]`                                                                                                                                                            | ✅                            |
| `contributions.activeDays`          | Days with count > 0                                                                                                                    | calendar → `countActiveDays`                                                                                                                                                                                 | ✅                            |
| `contributions.longestStreak`       | Longest run of consecutive active days, with start/end                                                                                 | calendar → `longestStreak`                                                                                                                                                                                   | ✅                            |
| `contributions.busiestMonth`        | Month with highest sum; ties → earlier month                                                                                           | calendar → `busiestMonth`                                                                                                                                                                                    | ✅                            |
| `contributions.monthly` / `weekday` | Sums per month / per weekday (0 = Sunday)                                                                                              | calendar                                                                                                                                                                                                     | ✅                            |
| `contributions.hourly`              | Commits per local hour                                                                                                                 | per-commit `authoredDate` via repo `history(author:{id}, since, until)` on default branches of the top 5 repos, ≤ 500 commits each. `authoredDate` because rebases and squash merges rewrite `committedDate` | 🟡 always `estimated: true`   |

## Languages

| Field                     | Definition                                                                                                                                    | Source                                                                                                       |     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --- |
| `languages.top[].share`   | For each repo the user committed to: `userCommits(repo) × languageBytes(repo, lang) / totalBytes(repo)`, summed per language, normalised to 1 | `commitContributionsByRepository` + `repository.languages(first: 10) { edges { size node { name color } } }` | 🟡  |
| `languages.top`           | Top 5 languages by share. Denominator is `languages.totalSize`, so bytes in languages beyond the first 10 lower every share slightly          | derived                                                                                                      | 🟡  |
| `languages.distinctCount` | Languages with share ≥ 1%                                                                                                                     | derived                                                                                                      | 🟡  |

Rationale: raw repo bytes over-weights large repos the user barely touched.

## Repositories

| Field                          | Definition                                      | Source                                                                                       |     |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------- | --- |
| `repositories.ownedTotal`      | Non-fork repos owned by the user (current)      | `viewer.repositories(ownerAffiliations: OWNER, isFork: false)`                               | ✅  |
| `repositories.contributedTo`   | Repos with ≥1 commit contribution in period     | `totalRepositoriesWithContributedCommits`                                                    | ✅  |
| `repositories.createdThisYear` | Owned non-fork repos with `createdAt` in period | repositories                                                                                 | ✅  |
| `repositories.top`             | Top 5 by user commit contributions in period    | `commitContributionsByRepository` (max 100 repos), summing `contributions.nodes.commitCount` | ✅  |

`contributions.totalCount` per repo counts **days**, not commits: there is one `CreatedCommitContribution` node per (repo, day). We sum `commitCount`, querying each calendar quarter separately so that no connection goes over 100 nodes. Spike A: the per-repo sum equalled `totalCommitContributions` exactly.

## Community impact (owned, non-fork repos)

| Field                                  | Definition                                              | Source                                                                                                            |                                             |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `community.totalStars` / `totalForks`  | Current totals at sync time                             | `stargazerCount`, `forkCount`                                                                                     | ✅                                          |
| `community.starsGained`                | Stars with `starredAt` inside period                    | `stargazers(orderBy: {field: STARRED_AT, direction: DESC}) { edges { starredAt } }`, paginate until before period | ✅ (cap pages for huge repos → `estimated`) |
| `community.forksGained`                | Forks with `createdAt` inside period                    | `forks(orderBy: {field: CREATED_AT, direction: DESC})`                                                            | ✅                                          |
| `community.mostStarred` / `mostForked` | Max current stars / forks; `null` when every repo has 0 | repositories                                                                                                      | ✅                                          |
| `community.mostStarredNew`             | Max stars among repos created in period                 | repositories                                                                                                      | ✅                                          |

Copy rule: "Your projects gained 128 stars in 2026" vs "Your projects have 412 stars". Never mix current totals with gains.

## Engineering

| Field                       | Definition                                                     | Source                                                                                     |     |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --- |
| `engineering.prsOpened`     | PRs authored in period                                         | `totalPullRequestContributions`                                                            | ✅  |
| `engineering.prsMerged`     | Of those, merged                                               | `pullRequestContributions { nodes { pullRequest { merged } } }` paginated                  | ✅  |
| `engineering.issuesOpened`  | Issues authored in period                                      | `totalIssueContributions`                                                                  | ✅  |
| `engineering.issuesClosed`  | Of those, now closed                                           | `issueContributions { nodes { issue { closed } } }`                                        | ✅  |
| `engineering.reviews`       | PR reviews submitted                                           | `totalPullRequestReviewContributions`                                                      | ✅  |
| `engineering.externalRepos` | Repos not owned by the user that received their commits or PRs | `commitContributionsByRepository` + `pullRequestContributionsByRepository`, owner ≠ viewer | ✅  |

`prsMerged` / `issuesClosed` are `estimated` when GitHub returned fewer detail nodes than the total (restricted items are left out of the list), and `unavailable` when it returned none.

## Spike A results (2026-11-04, one account, classic token with `repo` scope)

- `scripts/spike-github.ts` builds RecapData that passes `recapDataSchema.parse()`.
- Calendar total equals the github.com profile headline (3,463). Daily buckets differ near midnight (see Timezone above).
- `restrictedContributionsCount` returned 1,296 even with a `repo`-scoped token. Still to check: whether a GitHub App user token returns the same (ADR-0006).
- Cost of a full sync: 23 GraphQL requests (~1 point each), 18–50 s depending on network. The 5,000 points/hour limit is not a concern at this size; accounts with many starred repos add requests for stargazer pages.
- Feasibility: every field above is ✅ or 🟡 as marked. Nothing is infeasible. Archetypes are not computed yet (M3); `identity.archetype` is `null` for now.

## Archetypes

Rule-based, computed in `packages/analytics` (M3). Each archetype gets a score 0–1; highest score wins if it is ≥ its minimum threshold, otherwise `archetype = null` ("Your story is just beginning"). `reasons` lists the facts that drove the score.

| Id           | Signal (draft, tune with real data)                            | Minimum                                    |
| ------------ | -------------------------------------------------------------- | ------------------------------------------ |
| builder      | Repos created + commits to own repos                           | ≥ 2 repos created or ≥ 50 own-repo commits |
| consistent   | activeDays / days in period, longest streak                    | ≥ 30% active days                          |
| explorer     | `languages.distinctCount`, new languages vs earlier years (P1) | ≥ 4 languages                              |
| collaborator | reviews + PRs to others' repos                                 | ≥ 10 reviews or ≥ 10 external PRs          |
| night-owl    | share of commits 22:00–04:00 local (estimated)                 | ≥ 40% of ≥ 50 sampled commits              |
| open-sourcer | contributions to external public repos                         | ≥ 3 external repos                         |
