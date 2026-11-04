# 0008. Optional GitHub App installation for private repositories

- Status: Accepted
- Date: 2026-11-04
- Amends: [0006](0006-github-app-auth.md) (sign-in stays permission-free)

## Context

Users asked for private repositories, personal and organisation, to count. With the permission-free user token from ADR-0006, private **contributions** are already counted (totals, calendar, per-repository commits, including organisation repositories). What is missing is the list of private repositories the user owns (owned and created-this-year counts) and stargazer timestamps (`starsGained`). Both need the repository permission **Metadata: read**, which a user token only has on repositories where the app is installed.

## Decision

Keep sign-in as it is (one step, no repository permissions). Add an **optional** installation offered on the dashboard:

- The GitHub App requests **Metadata: read** only. No contents, no code.
- The dashboard links to `https://github.com/apps/<GITHUB_APP_SLUG>/installations/new`. The user picks their account or an organisation and the repositories; organisation owners may need to approve.
- After installing, the user syncs again. The existing fetch already reads `viewer.repositories` and stargazers; with the installation they return private repositories and stop answering `FORBIDDEN`, so no new query is needed.
- The button is hidden unless `GITHUB_APP_SLUG` is set, so it never points at an app that is not configured for it.

## Consequences

- The maintainer must add **Metadata: read** to the app's permissions in GitHub's app settings and set `GITHUB_APP_SLUG`. Existing users are asked by GitHub to accept the new permission only when they install.
- The privacy policy and landing copy keep saying "no repository permissions to sign in"; the dashboard explains the optional step and that it never reads code.
- Private repository names still never reach public pages (toPublicRecap) or exports (repoLabel).
