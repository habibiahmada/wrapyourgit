# 0006. GitHub App user authorization, no repository permissions

- Status: Accepted (verified 2026-11-04, see Verification)
- Date: 2026-11-04

## Context

Sign-in is required. We need the viewer's contributions (including the _count_ of private contributions), public repos, PRs, issues, reviews and stargazers of their owned public repos. We never need source code or write access.

## Decision

Use a **GitHub App** with the user authorization flow ("Sign in with GitHub"), requesting no repository permissions for MVP:
- Public data is readable with any user token.
- `contributionsCollection.restrictedContributionsCount` gives private contribution counts without repo access (only if the user enabled "Private contributions" on their profile).
- User access tokens expire (8 h) and come with refresh tokens, which limits damage if leaked.
- Private repo **details** (P1) would require the user to install the app on those repos. That's opt-in.
- **Stars gained** is unavailable for users who have not installed the app (see Verification). MVP ships it as unavailable: the Community scene shows current total stars, and the opt-in installation in P1 (Metadata: read on the selected repos) also unlocks `starsGained`. Login stays one step, with no installation and no permissions.

Alternatives considered after verification: requiring installation with Metadata: read at sign-in (heavier first step, and the install screen talks about repository access), and an OAuth App with `read:user` (tokens never expire, stargazer access untested).

## To verify (done, see below)

- That a GitHub App user token with no permissions returns `restrictedContributionsCount` and the calendar including private days, the same as a classic `read:user` OAuth token. If not, fall back to an OAuth App with `read:user` scope only.
- Rate limit cost of the full sync for a heavy account (stargazer pagination).

## Verification (2026-11-04)

Same account, same day, full spike (`scripts/spike-github.ts`) with two tokens: a classic `gh` token (`repo` scope) and a GitHub App user token with **no permissions, app not installed** (from `scripts/github-app-token.ts`, device flow, expires in 8 h).

| What                                                                             | GitHub App user token                                    | Classic token      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------ |
| Contribution calendar (308 days, total 3,464)                                    | identical                                                | identical          |
| `restrictedContributionsCount` (private count)                                   | 1,296                                                    | 1,296              |
| Commits, PRs (+ merged), issues (+ closed), reviews, per-repo commits, languages | identical                                                | identical          |
| Forks list, default-branch commit history                                        | ✅                                                       | ✅                 |
| `viewer.repositories` (owned, non-fork)                                          | 29 (public only)                                         | 54 (incl. private) |
| **Stargazers list** (`starredAt`), even on other people's public repos           | ❌ `FORBIDDEN`, "Resource not accessible by integration" | ✅                 |

The stargazers 403 carries `x-accepted-github-permissions: metadata=read`. Metadata is a repository permission, and for a user token it only applies on repositories where the app is installed. So without an installation, `community.starsGained` cannot be computed. The fetcher now returns `stars: null` and the recap shows `starsGained` as unavailable. It never shows 0.

Sync cost with the App token: 23 requests, the same as the classic token.

## Security requirements

Tokens encrypted (AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY`), never sent to the client; "Disconnect" revokes the grant and deletes tokens + recaps.
