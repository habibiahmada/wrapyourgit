# Metric definitions

Every number shown anywhere must be defined here. Field names refer to `RecapData` in `packages/schema/src/recap.ts`.

**Feasibility:** ✅ direct from API · 🟡 computed / estimated, label it · ❓ verify in Spike A

## Global rules

- **Period:** `meta.periodStart` = Jan 1 of the edition year; `meta.periodEnd` = Dec 31, or the sync date if earlier (then `isFinal = false` and the UI says "so far").
- **Timezone:** days and hours are bucketed in the user's timezone (`meta.timezone`, from the browser at sync). Timestamps are stored in UTC. ❓ GitHub's contribution calendar dates may already be in the user's GitHub-profile timezone; confirm in Spike A.
- **Unavailable ≠ 0:** if the API doesn't provide a value, use `{ status: "unavailable", reason }`.
- **Dedupe** by GitHub node ID.
- **Forks** are not counted as the user's own projects (`repositories.ownedTotal`, community stats).
- **Contributions ≠ commits.** Never sum categories and call it commits.

## Contributions

| Field                               | Definition                                                                                                                             | Source                                                                                                    |                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `contributions.total`               | Contributions GitHub counted in the period (commits, issues, PRs, reviews, repo creations, incl. private count if the user exposes it) | `contributionCalendar.totalContributions`                                                                 | ✅                            |
| `contributions.commits`             | Commit contributions attributed to the user                                                                                            | `totalCommitContributions`                                                                                | ✅                            |
| `contributions.privateCount`        | Contributions to private repos (count only)                                                                                            | `restrictedContributionsCount`                                                                            | ✅ / ❓ with GitHub App token |
| `contributions.calendar`            | One entry per day in period                                                                                                            | `contributionCalendar.weeks[].contributionDays[]`                                                         | ✅                            |
| `contributions.activeDays`          | Days with count > 0                                                                                                                    | calendar → `countActiveDays`                                                                              | ✅                            |
| `contributions.longestStreak`       | Longest run of consecutive active days, with start/end                                                                                 | calendar → `longestStreak`                                                                                | ✅                            |
| `contributions.busiestMonth`        | Month with highest sum; ties → earlier month                                                                                           | calendar → `busiestMonth`                                                                                 | ✅                            |
| `contributions.monthly` / `weekday` | Sums per month / per weekday (0 = Sunday)                                                                                              | calendar                                                                                                  | ✅                            |
| `contributions.hourly`              | Commits per local hour                                                                                                                 | per-commit `committedDate` via repo `history(author:{id}, since, until)` on default branches of top repos | 🟡 always `estimated: true`   |

## Languages

| Field                     | Definition                                                                                                                                    | Source                                                                                                       |     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --- |
| `languages.top[].share`   | For each repo the user committed to: `userCommits(repo) × languageBytes(repo, lang) / totalBytes(repo)`, summed per language, normalised to 1 | `commitContributionsByRepository` + `repository.languages(first: 10) { edges { size node { name color } } }` | 🟡  |
| `languages.distinctCount` | Languages with share ≥ 1%                                                                                                                     | derived                                                                                                      | 🟡  |

Rationale: raw repo bytes over-weights large repos the user barely touched.

## Repositories

| Field                          | Definition                                      | Source                                                         |     |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------------------------- | --- |
| `repositories.ownedTotal`      | Non-fork repos owned by the user (current)      | `viewer.repositories(ownerAffiliations: OWNER, isFork: false)` | ✅  |
| `repositories.contributedTo`   | Repos with ≥1 commit contribution in period     | `totalRepositoriesWithContributedCommits`                      | ✅  |
| `repositories.createdThisYear` | Owned non-fork repos with `createdAt` in period | repositories                                                   | ✅  |
| `repositories.top`             | Top 5 by user commit contributions in period    | `commitContributionsByRepository` (max 100 repos)              | ✅  |

## Community impact (owned, non-fork repos)

| Field                                  | Definition                              | Source                                                                                                            |                                             |
| -------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `community.totalStars` / `totalForks`  | Current totals at sync time             | `stargazerCount`, `forkCount`                                                                                     | ✅                                          |
| `community.starsGained`                | Stars with `starredAt` inside period    | `stargazers(orderBy: {field: STARRED_AT, direction: DESC}) { edges { starredAt } }`, paginate until before period | ✅ (cap pages for huge repos → `estimated`) |
| `community.forksGained`                | Forks with `createdAt` inside period    | `forks(orderBy: {field: CREATED_AT, direction: DESC})`                                                            | ✅                                          |
| `community.mostStarred` / `mostForked` | Max current stars / forks               | repositories                                                                                                      | ✅                                          |
| `community.mostStarredNew`             | Max stars among repos created in period | repositories                                                                                                      | ✅                                          |

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
