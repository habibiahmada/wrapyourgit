# 0020. Stars gained come from GitHub's star history, and per-repo walks run under a time budget

- Status: Accepted
- Date: 2026-11-11
- Amends: [0006](0006-github-app-auth.md) consequence "Stars gained is unavailable for users who have not installed the app", and [0008](0008-optional-app-installation.md) on what the installation unlocks

## Context

`community.starsGained` and `forksGained` count events inside the period, a number GitHub doesn't store. We walked each owned repo's stargazers and forks newest first, one repo after another, up to 10 pages each (#71).

- Stargazers need Metadata access, and since July 2026 the listing is limited to admins and collaborators. So `starsGained` was unavailable for owners without the app installed (ADR-0006) and on every public recap (ADR-0019).
- Forks have no such limit, but a page of forks on a popular repo takes 2–6 s to build. Fetching octocat's public recap took 80 s, 75 s of it in fork pages. Nothing bounded the total, and the public route stops at 120 s.

In September 2026 GitHub added `GET /repos/{owner}/{repo}/stargazers/history`. It returns daily star counts in calendar weeks, 30 weeks per request, with no identities. It answers with no token at all for a public repo, so any token can read it. Measured with the public token: about 0.4 s per request, two requests for a year.

There is no fork equivalent. The alternatives were measured and rejected:

- **REST forks list with page numbers**, which allows a binary search for the 1 January boundary. It was no faster per page (2–9 s), and on octocat/Spoon-Knife about half the requests failed with 500 or 502.
- **GH Archive in ClickHouse** (`github_events`). It is fast, but it held about 10% of the forks and 20–30% of the stars that GitHub reports for the same repos. That fails "every number is correct".

## Decision

1. **Stars gained are summed from star history**, per day, for owned repos with stars. A repo whose history the token can't read, or a spent rate limit, makes the metric unavailable, never a partial sum.
2. **Forks gained still walk the forks connection.**
3. **Both walks run four repos at a time under one time budget each**: 15 s for stars and 20 s for forks. The two walks run side by side, most-starred and most-forked repos first.
4. **Cuts are estimates, not errors.** A repo the budget didn't reach, or one GitHub failed to serve (5xx), is reported incomplete, so the metric is `estimated` and the UI labels it.
5. **The other parts of a fetch run side by side too**: overview, commit repositories and their sample, PRs, issues, owned repos, and starred repos. Commit repositories are queried one quarter per request, and a GraphQL gateway error (502/503/504) is retried once.

## Consequences

- `starsGained` is available on public recaps, and for owners on all their public repos without the installation. Private owned repos are listed only with the installation (ADR-0008), which also gives the access their history needs.
- Measured fetch times, all within the 120 s limit:
  - octocat: from 80 s to 24 s;
  - torvalds: 21 s;
  - sindresorhus (1,132 repos): 53 s, where it used to fail with 502/504 on the commit query in most runs.
- Star history counts stars as they stand. A removed star is gone from the history, and GitHub doesn't promise its day boundaries are UTC, so a star near midnight can land on the neighbouring day.
- For accounts with many popular repos, `starsGained` and `forksGained` are lower-bound estimates.
- Up to about a dozen requests are in flight per fetch instead of one. That is far below GitHub's secondary limit on concurrent requests.
