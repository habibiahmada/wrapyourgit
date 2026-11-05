# Metric definitions

Every number shown anywhere must be defined here. Field names refer to `RecapData` in `packages/schema/src/recap.ts`.

**Feasibility:** ✅ direct from API · 🟡 computed / estimated, label it · ❓ verify in Spike A

## Global rules

- **Period:** `meta.periodStart` = Jan 1 of the edition year; `meta.periodEnd` = Dec 31, or the sync date if earlier (then `isFinal = false` and the UI says "so far").
- **Timezone:** `meta.timezone` (from the browser at sync) sets `periodEnd` and the `hourly` buckets. Timestamps are stored in UTC. Star/fork/repo-creation dates and the PR/issue window use UTC dates.
- **Calendar days are GitHub's, not ours.** Verified in Spike A: GitHub puts each commit on the date in **the commit's own git timezone offset** (the author's machine clock, e.g. `+0700`), then reports the day as `occurredAt` = midnight America/Los_Angeles of that date (`07:00Z` in summer, `08:00Z` in winter). Commit contributions are only available per (repo, day), so we cannot re-bucket them into `meta.timezone`, and we don't try. `contributions.calendar`, `activeDays`, `longestStreak`, `busiestMonth`, `monthly` and `weekday` all use GitHub's days. Because of this the fetch range always runs to Dec 31 23:59:59Z and is never cut at "now".
- **Known difference from github.com:** the profile graph shown to logged-out visitors has the same yearly total, but on about 4% of days one contribution sits on the neighbouring day (12 of 308 days in Spike A, so `activeDays` was 161 here vs 163 on github.com; the streak matched). The `tz` cookie does not change that graph. UI copy must not promise a day-exact match with the profile graph.
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

| Field                          | Definition                                                                                 | Source                                                                                       |     |
| ------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | --- |
| `repositories.ownedTotal`      | Non-fork repos owned by the user (current). Public only with a GitHub App token (ADR-0006) | `viewer.repositories(ownerAffiliations: OWNER, isFork: false)`                               | ✅  |
| `repositories.contributedTo`   | Repos with ≥1 commit contribution in period                                                | `totalRepositoriesWithContributedCommits`                                                    | ✅  |
| `repositories.createdThisYear` | Owned non-fork repos with `createdAt` in period                                            | repositories                                                                                 | ✅  |
| `repositories.top`             | Top 5 by user commit contributions in period                                               | `commitContributionsByRepository` (max 100 repos), summing `contributions.nodes.commitCount` | ✅  |

`contributions.totalCount` per repo counts **days**, not commits: there is one `CreatedCommitContribution` node per (repo, day). We sum `commitCount`, querying each calendar quarter separately so that no connection goes over 100 nodes. Spike A: the per-repo sum equalled `totalCommitContributions` exactly.

**Derived on screen: share of the year's commits** (Projects chapter, `packages/video/src/share.ts`). The top four of `repositories.top` and "every other repository" as squares of a 10 × 10 grid, 1 square = 1%. Base = `max(contributions.commits, sum of the four)`, so shares never pass 100% when the two GitHub fields disagree. Squares are handed out by largest remainder (exactly 100 in total); each label is its square count, so label and picture always agree (within 1% of the exact share), and a repository with commits but no square reads "<1%". Not stored: computed from the two fields above at render time.

## Community impact (owned, non-fork repos)

| Field                                  | Definition                                              | Source                                                                                                            |                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `community.totalStars` / `totalForks`  | Current totals at sync time                             | `stargazerCount`, `forkCount`                                                                                     | ✅                                                                                                                                            |
| `community.starsGained`                | Stars with `starredAt` inside period                    | `stargazers(orderBy: {field: STARRED_AT, direction: DESC}) { edges { starredAt } }`, paginate until before period | 🟡 needs Metadata access: `unavailable` for GitHub App users who haven't installed the app (ADR-0006); cap pages for huge repos → `estimated` |
| `community.forksGained`                | Forks with `createdAt` inside period                    | `forks(orderBy: {field: CREATED_AT, direction: DESC})`                                                            | ✅                                                                                                                                            |
| `community.mostStarred` / `mostForked` | Max current stars / forks; `null` when every repo has 0 | repositories                                                                                                      | ✅                                                                                                                                            |
| `community.mostStarredNew`             | Max stars among repos created in period                 | repositories                                                                                                      | ✅                                                                                                                                            |

Copy rule: "Your projects gained 128 stars in 2026" vs "Your projects have 412 stars". Never mix current totals with gains.

## Starred by you

Repositories the user starred during the period, anyone's (their own included). This is the opposite direction from community impact: what caught the user's eye, not who noticed the user's work.

| Field               | Definition                                                                                                                                                       | Source                                                                                                                                                          |                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `starred.count`     | Repositories with `starredAt` inside the period                                                                                                                  | `viewer.starredRepositories(orderBy: {field: STARRED_AT, direction: DESC}) { edges { starredAt node { … } } }`, paginated until an edge falls before the period | ✅ (page cap reached → `estimated`) |
| `starred.top`       | The five starred-in-period repositories with the most stargazers (ties: earlier `starredAt` first). Private ones are dropped from public recaps; the count stays | same, node `stargazerCount`                                                                                                                                     | ✅                                  |
| `starred.languages` | Starred-in-period repositories per `primaryLanguage`, most first (ties alphabetical), at most five; repositories without a language are left out                 | same, node `primaryLanguage`                                                                                                                                    | ✅                                  |

Unavailable when GitHub does not allow listing the stars. Spike on 2026-11-04 for the maintainer: 95 repositories starred in 2026 (of 103 ever), all public; languages Python 24, TypeScript 22, JavaScript 17, Rust 9, Go 8.

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

## Previous year (comparison)

`previousYear` (schema v2) compares this year with last year like for like. One GraphQL request (`fetchPreviousYear` in @wyg/github) reads two `contributionsCollection` ranges: all of last year (for its calendar) and 1 January to the **same day of the year** as this recap's period end (`sameSpan.through`). While this year is still running, the comparison is "this year so far" against "last year up to the same date"; once the year is final, the span is the whole year.

| Field                                                      | Definition                                                 | Source                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `sameSpan.contributions`                                   | Calendar total for the span                                | `contributionCalendar.totalContributions` |
| `sameSpan.commits` / `pullRequests` / `issues` / `reviews` | Totals for the span                                        | `total*Contributions`                     |
| `sameSpan.reposWithCommits`                                | Repositories with commits in the span                      | `totalRepositoriesWithContributedCommits` |
| `sameSpan.privateCount`                                    | Private contributions in the span (count only)             | `restrictedContributionsCount`            |
| `sameSpan.activeDays` / `longestStreak`                    | Same functions as this year, on the span's days            | full calendar, cut at `through`           |
| `fullYear.*`                                               | Total, active days and longest streak for all of last year | full calendar                             |

If the request fails, the sync still succeeds and `previousYear` is **unavailable** (never zeros). Compared with this year's `contributions.total`, `commits`, `activeDays`, `longestStreak.days`, `engineering.prsOpened`, `issuesOpened`, `reviews`, `repositories.contributedTo` and `privateCount`.

## Private repositories

Without an installation the sign-in token has no repository permissions (ADR-0006). Private **contributions** are still counted (totals, calendar, per-repository commits including organisation repositories the user contributes to); private repository **names** never appear in anything shareable. What needs the optional installation (ADR-0008, Metadata: read on chosen repositories or organisations): private repositories the user **owns** (`repositories.ownedTotal`, `createdThisYear`) and `community.starsGained`.

## Spike A results (2026-11-04, one account, classic token with `repo` scope)

- `scripts/spike-github.ts` builds RecapData that passes `recapDataSchema.parse()`.
- Calendar total equals the github.com profile headline (3,463). Daily buckets differ on a few days (see "Known difference" above).
- A GitHub App user token with no permissions returns the same calendar, private count (1,296) and engineering numbers as a `repo`-scoped token. Differences: `ownedTotal`/`createdThisYear` count public repos only, and stargazers are forbidden, so `starsGained` is unavailable (ADR-0006).
- Cost of a full sync: 23 GraphQL requests (~1 point each), 18–50 s depending on network. The 5,000 points/hour limit is not a concern at this size; accounts with many starred repos add requests for stargazer pages.
- Feasibility: every field above is ✅ or 🟡 as marked. Nothing is infeasible. Archetypes are not computed yet (M3); `identity.archetype` is `null` for now.

## Archetypes

Rule-based, in `packages/analytics/src/archetype.ts`. An archetype is only scored when its **minimum** is met. Its **strength** is the signal divided by what a strong year looks like (1 = strong). The highest strength wins, and ties go to the archetype listed first in the table. When no minimum is met, `archetype = null` and the UI says "Your story is just beginning". `scores` holds `strength / (1 + strength)` for every archetype that qualified. That maps each strength into 0–1 without changing the order, and two very strong archetypes never both land on exactly 1. `reasons` are the winner's facts, most telling first, with zero-valued facts left out. Counts only: repository names never appear in reasons.

| Id           | Minimum                                      | Strength (1 = strong year)                     | Reasons                                      |
| ------------ | -------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| builder      | ≥ 2 repos created or ≥ 50 own-repo commits   | max(created / 10, own-repo commits / 500)      | own-repo commits; repos created this year    |
| consistent   | ≥ 30% of days in the period active           | (active share / 0.5 + longest streak / 30) / 2 | active share; longest streak                 |
| explorer     | ≥ 4 languages (`languages.distinctCount`)    | languages / 6                                  | language count                               |
| collaborator | ≥ 10 reviews or ≥ 10 external PRs            | (reviews + external PRs) / 30                  | reviews; PRs to repos the user doesn't own   |
| night-owl    | ≥ 40% of ≥ 50 sampled commits in 22:00–04:00 | night share / 0.4                              | night share (estimated: sample of top repos) |
| open-sourcer | ≥ 3 external public repos                    | external public repos / 6                      | count of public repos the user doesn't own   |

Inputs: own-repo commits sum `commitContributionsByRepository` where owner = viewer. External PRs sum `pullRequestContributionsByRepository.contributions.totalCount` where owner ≠ viewer. External public repos are the union of commit and PR repos where owner ≠ viewer and `isPrivate` is false. The active share is `activeDays` divided by the days in the period so far.

**Tuning status (2026-11-04):** the reference values were set against one real account (the maintainer's year so far) plus the persona cases in `archetype.test.ts`. That account comes out as builder 0.80, open-sourcer 0.63, consistent 0.62, explorer 0.60 and collaborator 0.35, which reflects 2,049 commits to their own repos against about 40 elsewhere. Re-tune with more accounts during the staging beta (M6) before the final recaps.
