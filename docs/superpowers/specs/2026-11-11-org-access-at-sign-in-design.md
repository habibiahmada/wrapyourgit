# Organisation access at sign-in: design

Date: 2026-11-11. Status: **stopped on 2026-11-13** at the Phase 0 spike: an organisation installation with Metadata: read does not reveal a member's private contributions, and a Request does not return to the Setup URL ([ADR-0027](../../architecture/decisions/0027-organisation-installs-do-not-reveal-private-work.md)). Approved by the maintainer on 2026-11-11.

## Intent

Many developers do most of their year in private organisation repositories. Today their recap counts that work only as one "restricted" number: GitHub hides whether it was commits, pull requests or reviews, in which repository, in which language, because the organisation has not allowed WrapYourGit. The recap feels empty exactly where their year was busiest.

The maintainer wants the sign-in itself to lead there: right after signing in with GitHub, a user (new or existing) who has organisation work WrapYourGit cannot see lands on GitHub's own installation page, where they pick their organisations and press **Install** (if they own it) or **Request** (if they are a member, which asks the owner). Then they come back to their story.

## Goals

1. After sign-in, a user with restricted contributions who has not been asked before goes straight to GitHub's installation page for the WrapYourGit app, then back to their story.
2. On that page, organisations the user doesn't own offer GitHub's **Request** to the owner; organisations they own offer **Install**.
3. Once an installation covers an organisation, the next sync counts that organisation's private work with details.
4. Users with nothing restricted, and users already asked, sign in exactly as today.

## Non-goals

- Seeing or chasing the status of a request (GitHub doesn't expose pending requests to the requester).
- Notifying the user when an owner approves.
- New metrics, schema fields in `RecapData`, or story scenes. The existing scenes already show the details once GitHub returns them.
- Personal access tokens or OAuth `repo` scopes (full code access; rejected in ADR-0006).

## Anti-goals (a failure even if it works)

- Weakening sign-in: dropping `state` or PKCE from the OAuth callback (why approach C was rejected).
- Sending everyone to the installation page on every sign-in.
- A user stranded on GitHub with no way back to their story.
- Asking for more than **Metadata: read**, or claiming on the site that sign-in itself asks for repository permissions.
- Private organisation repository names reaching a public page, card or the visitor's files (AGENTS.md rule 6; the owner's own story follows ADR-0017).

## Constraints

- Sign-in stays the GitHub App web flow with `state` and PKCE (ADR-0006, `api/auth/signin`, `api/auth/callback/github`).
- The app already asks for **Metadata: read** for the optional installation (ADR-0008). Its "Request user authorization (OAuth) during installation" option stays **off**: with it on, GitHub starts the authorization itself with only `client_id`, so our callback can't verify `state` or PKCE, and the Setup URL field is disabled.
- GitHub sends the installer to the app's **Setup URL** with `installation_id` and `setup_action`. `installation_id` can be spoofed: it is checked against the signed-in user's own installations before anything trusts it.
- Vercel production only (ADR-0018); Neon Postgres via Drizzle.

## Approaches

| Approach                                                                                                                                                                                                                     | Trade-off                                                                                                                       | Picked               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **A. Sign in first, then the installation page only when needed.** The callback checks restricted contributions and existing installations; if needed, redirects to `installations/new`; the Setup URL returns to the story. | Keeps sign-in secure and unchanged for most users; one extra API check at sign-in.                                              | **Yes** (maintainer) |
| B. Installation page for everyone before sign-in (`installations/new` → Setup URL → sign-in).                                                                                                                                | Closest to "GitHub first", but everyone sees an installation page, including people with no organisations or already installed. | No                   |
| C. GitHub's "authorize during installation" option.                                                                                                                                                                          | Least code, but the callback loses `state`/PKCE (login forgery), and the Setup URL is disabled.                                 | No                   |

## Design

### Phase 0: spike (gate)

Two facts the documentation doesn't settle. Prove both on **pplg-team** (the maintainer is its admin) before building anything else:

1. With the app installed on an organisation with Metadata: read on chosen repositories, does the user token's `contributionsCollection` move those contributions out of `restrictedContributionsCount` and into the per-repository details? If not, which permission does (for example Contents: read), and the maintainer decides whether that is acceptable. If no read-only permission does it, stop: the feature cannot deliver its goal.
2. When a member presses **Request** instead of Install, does GitHub redirect to the Setup URL (and with which `setup_action`)? The answer decides how the user gets back (below).

Record both answers in the ADR.

### Sign-in flow

```
Sign in → GitHub authorize (state + PKCE, unchanged) → /api/auth/callback/github
  → start the session (unchanged)
  → needs the org step?  yes → redirect to https://github.com/apps/<GITHUB_APP_SLUG>/installations/new
                         no  → redirect to the story (unchanged)
GitHub installation page → Install / Request → Setup URL: /api/auth/installed → the story
```

**Needs the org step** when all of these hold:

- `GITHUB_APP_SLUG` is set (as for the dashboard button today);
- the user has not been asked before (`users.org_prompted_at` is null);
- one cheap GraphQL call with the new token reports `restrictedContributionsCount > 0` for the edition year.

The callback sets `org_prompted_at` before redirecting, so the step happens once per user, whatever they do on GitHub. If the check fails (network, rate limit), sign-in goes to the story as today: the step must never block signing in.

### Returning from GitHub

`/api/auth/installed` (the app's Setup URL):

- Requires a session; without one, sends the user to sign in, which then lands on the story.
- If `installation_id` is present, confirms it appears in the user's own `GET /user/installations`; ignores it otherwise.
- After an Install, marks the recap stale so the story's loading screen syncs again and shows the new detail.
- Always ends on the user's story (`recapPath(login)`).

If the spike shows GitHub does not redirect after a Request, the installation page is opened so the user can still return: the callback first renders a short WrapYourGit page that explains the step and links to GitHub in the same tab, with a plain "Continue to your story" link beside it. Otherwise no page of ours sits in between.

### After an owner approves later

No webhook. The recap's normal refresh (a stale recap syncs when its owner opens the story, and Sync again on the dashboard) picks up the newly visible work. The dashboard's existing install section (`install-private.tsx`) keeps offering the installation page, with copy that now also says organisation members can request it and that approved organisations count after the next sync.

### Data

- New nullable column `users.org_prompted_at` (timestamptz), via a Drizzle migration, with no backfill: existing users with restricted work are also asked once, at their next sign-in after release (maintainer, 2026-11-11).
- Nothing new in `RecapData` or the analytics: details arrive through the existing queries once GitHub returns them.

### Copy and docs

- Privacy page: the "Repository metadata, only if you choose" item adds that WrapYourGit may open GitHub's installation page once after sign-in, and that a request goes to the organisation's owner. Sign-in itself still asks for no repository permissions.
- A new ADR records the flow, supersedes ADR-0008's "offered on the dashboard" with "offered once after sign-in, and on the dashboard", and records the spike's answers.
- Deployment guide: set the app's **Setup URL** to `<APP_URL>/api/auth/installed`; keep "Request user authorization during installation" off.

## Calls I made (the maintainer can override them)

- Ask once per user, ever (not every N days). A user who skipped can still install from the dashboard.
- The sign-in check uses the restricted count only, not existing installations: one API call, and a user who installed on one organisation but still has restricted work elsewhere is asked once like anyone else.
- The Setup URL is one setting for the whole app, so the dashboard button goes through `/api/auth/install`, which sets a 10-minute `wyg_install_from=dashboard` cookie and redirects to `installations/new`. `/api/auth/installed` returns to the dashboard when that cookie is present, and to the story otherwise.
- Phase 0 is its own deliverable: the maintainer installs the app on pplg-team and presses Request on an organisation they don't own, we record the results in the ADR, and the implementation plan is written only after that, for the outcome that actually happened.
- Only users with restricted contributions see the step; users whose organisations are already visible are not interrupted.
- No WrapYourGit page before GitHub's, unless the spike forces it (the maintainer asked for GitHub's page first).

## Left to the builder

- The exact GraphQL query for the restricted count at sign-in (reuse `packages/github`).
- How the recap is marked stale after an Install.
- Tests: the decision function (slug, prompted, restricted, check failure), the `installation_id` check, and the route redirects.
