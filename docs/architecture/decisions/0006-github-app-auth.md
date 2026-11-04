# 0006. GitHub App user authorization, no repository permissions

- Status: Proposed, verify in Spike A / M2
- Date: 2026-11-04

## Context

Sign-in is required. We need the viewer's contributions (including the _count_ of private contributions), public repos, PRs, issues, reviews and stargazers of their owned public repos. We never need source code or write access.

## Decision (proposed)

Use a **GitHub App** with the user authorization flow ("Sign in with GitHub"), requesting no repository permissions for MVP:
- Public data is readable with any user token.
- `contributionsCollection.restrictedContributionsCount` gives private contribution counts without repo access (only if the user enabled "Private contributions" on their profile).
- User access tokens expire (8 h) and come with refresh tokens, which limits damage if leaked.
- Private repo **details** (P1) would require the user to install the app on those repos. That's opt-in.

## To verify

- That a GitHub App user token with no permissions returns `restrictedContributionsCount` and the calendar including private days, the same as a classic `read:user` OAuth token. If not, fall back to an OAuth App with `read:user` scope only.
- Rate limit cost of the full sync for a heavy account (stargazer pagination).

## Security requirements

Tokens encrypted (AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY`), never sent to the client; "Disconnect" revokes the grant and deletes tokens + recaps.
