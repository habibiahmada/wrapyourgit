# Recap for any GitHub username — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every GitHub username has a recap at `/<username>`. Visitors get the public recap; the signed-in owner gets their full recap at the same address. Both go straight from loading to the story, with no "Build" or "Play" clicks.

**Architecture:**

- **Public data:** `packages/github` learns to query `user(login:)` as well as `viewer`. It does this by aliasing the root field, so every response keeps its current shape.
- **Fetching and storing:** a server module fetches a public recap with one public-only token, stores it per GitHub user id, and serves it for 12 hours. It runs one fetch per account at a time, limits new lookups per client, and stops starting fetches when the GitHub quota runs low.
- **The route:** `app/[username]/page.tsx` streams a loading screen through `Suspense` while the fetch or the owner's auto-sync runs, then plays the existing story world.
- **The schema:** it gains `meta.scope` so a public recap is labelled inside the composition, and therefore in every exported file.

**Tech Stack:** Next.js 16 (App Router, Cache Components), Drizzle + Neon Postgres, GitHub GraphQL, Remotion story world (existing), Bun test, Biome.

**Spec:** `docs/superpowers/specs/2026-11-11-username-recap-design.md` (approved 2026-11-11). Related: ADR-0006, ADR-0016, ADR-0017, ADR-0018.

## Global Constraints

- **AGENTS.md rules 1–8.**
  - Rule 1: `meta.scope` goes into the schema, `metrics.md` and analytics with tests before any scene reads it.
  - Rule 5: the public token is a server-only env var, `GITHUB_PUBLIC_TOKEN`.
  - Rule 6: visitors only ever see `toPublicRecap` of a public fetch, never a projection of the owner's full recap.
- **The public token is a fine-grained PAT on one machine account,** limited to "public repositories (read-only)". There is no token pool and no rotation across accounts. Spreading requests over several accounts breaks GitHub's terms.
- **Fixed values from the spec:**
  - public recap freshness: 12 hours;
  - last year's comparison: fetched once per account and kept;
  - one fetch per account at a time;
  - reserved route names fall back to `/u/<name>`.
- **Copy, verbatim from the spec:**
  - "@x has hidden their recap"
  - "No GitHub user called @x"
  - "The server is busy, try again in a few minutes"
  - "Hide my public recap"
  - The org message and the label are the builder's wording, decided in Tasks 2 and 4 below.
- **New pages:** WCAG 2.2 AA and the antislop Hard Gate. Load `antislop:antislop`, `antislop-human` and `antislop-ui` before any UI edit.
- **Commits:** Conventional Commits in English, no AI attribution. Work on the feature branch, never on `main`.

## Decisions this plan makes (the maintainer can override them)

- **Per-client limit:** 20 new usernames per hour per client. "New" means not stored, or stale. The client key is a salted SHA-256 of the IP from `x-forwarded-for`; the raw IP is never stored.
- **Quota floor:** new fetches stop when GitHub reports fewer than 300 points remaining.
- **Owner freshness:** the owner's own recap auto-syncs when it is missing or older than 12 hours. The existing 10-minute sync cooldown still applies to the dashboard's manual sync.
- **Public label:** `meta.scope = "public"`. The Hello scene adds one line, "Public GitHub activity only", which also appears in exported files. The web player shows nothing extra.
- **Organisations:** they see "@x is an organisation. Recaps are for people."
- **Old addresses:**
  - `/u/<login>` redirects (308) to `/<login>`, unless the login is a reserved name, in which case it serves the recap itself.
  - `/recap` redirects to the signed-in user's `/<login>`, or to `/` when signed out.
  - Sign-in returns to `/<login>`.

## Review Focus

1. **Two visitors open a new username at the same moment.** Expected: one GitHub fetch, both get the story. _(Task 3: `claimFetch` test plus a `waitForFresh` test.)_
2. **The owner opens their own `/<username>` while signed in, and has hidden their public recap.** Expected: they still see their full recap; only visitors get the hidden message. _(Task 4: page branch test via `viewerKind`.)_
3. **A username written in different case (`/HabibiAhmada`).** Expected: a redirect to the canonical login. Hidden and cache lookups go by GitHub id, so case never creates a second copy. _(Task 3 and Task 4 tests.)_
4. **A GitHub account named like a site route (`settings`).** Expected: `/settings` stays the settings page, and `/u/settings` shows that account's recap. _(Task 4: `isReserved` test.)_
5. **A fetch that fails halfway.** Expected: nothing is stored, the fetch claim is released, and the page shows an error with a retry. _(Task 3: failure test.)_

---

### Task 1: Query any user, not only the viewer

**Files:**

- Modify: `packages/github/src/activity.ts`
- Modify: `packages/github/src/index.ts` (exports)
- Create: `packages/github/src/subject.ts`, `subject.test.ts`, and `packages/github/src/account.ts` (with `account.test.ts` where pure parts allow)

**Interfaces:**

- Produces:
  - `type Subject = { kind: "viewer" } | { kind: "user"; login: string }`
  - `withSubject(query: string, subject: Subject): string` aliases every root `viewer {` to `viewer: user(login: $login) {` and adds `$login: String!` to the operation's variables. For a viewer subject it returns the query unchanged.
  - `subjectVariables(subject: Subject): Record<string, string>` returns `{}` or `{ login }`.
  - `fetchYearActivity(token, from, to, options?, subject: Subject = { kind: "viewer" })`
  - `fetchPreviousYear(token, year, spanTo, subject: Subject = { kind: "viewer" })`
  - `lookupAccount(token: string, login: string): Promise<AccountLookup>`, built on `repositoryOwner(login:)` and `rateLimit`, where `type AccountLookup = { kind: "user"; id: number; login: string } | { kind: "organization"; login: string } | { kind: "missing" }`, each with `remaining: number; resetAt: string`.

- [ ] **Write failing tests in `subject.test.ts`:**
  - `withSubject(OVERVIEW_QUERY, { kind: "user", login: "octo" })` contains `query Overview($from: DateTime!, $to: DateTime!, $login: String!)` and `viewer: user(login: $login) {`, and no bare `viewer {`.
  - The same holds for a query with no variables yet (`OwnedRepos`). It becomes `query OwnedRepos($after: String, $login: String!)`; a query with no parentheses gets `($login: String!)`.
  - The dynamically built `CommitRepos` query also gets the alias.
  - A viewer subject returns the input unchanged.
  - `subjectVariables` returns `{}` for a viewer and `{ login: "octo" }` for a user.
- [ ] Run `bun test packages/github`. Expected: FAIL (module missing).
- [ ] Implement `subject.ts`. Thread `subject` through every `githubGraphql` call in `activity.ts`: pass `withSubject(query, subject)` and spread `subjectVariables(subject)` into the variables. Stargazer queries take an explicit repository and stay as they are.
- [ ] Implement `lookupAccount` with one query: `repositoryOwner(login: $login) { __typename login ... on User { databaseId } } rateLimit { remaining resetAt }`. A null owner means `missing`.
- [ ] Run `bun test`, `bun run typecheck` and `bun run lint`. Expected: pass, and the existing viewer behaviour is unchanged (no test edits outside `packages/github`).
- [ ] Commit `feat(github): fetch a year for any user, and look up an account`.

### Task 2: A recap knows whether it is public

**Files:**

- Modify: `packages/schema/src/recap.ts` (add `meta.scope`, bump `SCHEMA_VERSION` to 5)
- Modify: `packages/analytics/src/recap.ts` (`BuildOptions.scope`)
- Modify: fixtures in `packages/video/src/fixtures/*` and `packages/analytics` tests (add `scope: "full"`)
- Modify: the Hello scene model and scene in `packages/video/src/world/scenes/`
- Modify: `docs/analytics/metrics.md` (a `meta.scope` row)

**Interfaces:**

- Produces:
  - `meta.scope: "full" | "public"` (zod enum).
  - `buildRecap(input, { year, timezone, now, scope })`, where `scope` defaults to `"full"`.
  - The Hello model gains `publicOnly: boolean`.

- [ ] **Write failing tests:**
  - `buildRecap(..., { scope: "public" }).meta.scope === "public"`, and the default is `"full"`.
  - The Hello model on public data has `publicOnly === true` and carries the line "Public GitHub activity only".
  - On full data it has `publicOnly === false` and no such line.
- [ ] Run them. Expected: FAIL.
- [ ] Implement the change. The scene draws the line under the greeting, sized with `labelFontSize` and readable in all three layout families. Check it with `bun scripts/world-stills.ts hello --fixture public-sample`, after setting `scope: "public"` on that fixture.
- [ ] Run `bun test`, `bun run typecheck` and `bun run lint`. The schema version bump makes stored rows "missing"; there are no real users, so a resync is acceptable.
- [ ] Commit `feat(schema): mark a recap as public or full, and say so in the story`.

### Task 3: Fetch, store and serve public recaps

**Files:**

- Modify: `apps/web/src/server/db/schema.ts` and add the migration (`bunx drizzle-kit generate`)
- Modify: `apps/web/src/server/env.ts` users (read `GITHUB_PUBLIC_TOKEN` via `requireEnv`)
- Create: `apps/web/src/server/public-recaps.ts` and `public-policy.ts` + `public-policy.test.ts`

**Tables:**

- `public_recaps`: `github_id` (bigint, PK), `login`, `data` (jsonb), `schema_version`, `previous` (jsonb, last year's raw activity, kept), `fetched_at`, `fetching_since` (nullable).
- `hidden_accounts`: `github_id` (PK), `hidden_at`.
- `public_lookups`: `client` (text), `at` (timestamptz), indexed on `(client, at)`.

**Interfaces:**

- Consumes: Task 1 (`lookupAccount`, `fetchYearActivity` / `fetchPreviousYear` with a user subject) and Task 2 (`scope`).
- Produces:
  - `type PublicResult = { kind: "recap"; login: string; data: RecapData } | { kind: "missing" | "organization" | "hidden" | "busy" | "limited" | "error"; login: string }`
  - `getPublicRecap(login: string, client: string): Promise<PublicResult>`. The returned data is always `toPublicRecap(buildRecap(..., { scope: "public", timezone: "UTC" }))`.
  - `isHidden(githubId: number): Promise<boolean>`, `setHidden(githubId: number, hidden: boolean): Promise<void>` and `forgetPublicRecap(githubId: number): Promise<void>`.
  - `clientKey(headers: Headers): string`, a salted SHA-256 of the first `x-forwarded-for` address, with the salt read from `TOKEN_ENCRYPTION_KEY`.
  - **Pure, in `public-policy.ts`:**
    - `isFresh(fetchedAt: Date, now: Date): boolean` (12 hours)
    - `canStartFetch(remaining: number): boolean` (≥ 300)
    - `underClientLimit(recentLookups: number): boolean` (< 20)
    - `claimIsStale(since: Date, now: Date): boolean` (> 2 minutes)

- [ ] **Write failing tests in `public-policy.test.ts`:**
  - `isFresh` is true at 11 h 59 m and false at 12 h 01 m.
  - `canStartFetch(300)` is true and `canStartFetch(299)` is false.
  - `underClientLimit(19)` is true and `underClientLimit(20)` is false.
  - `claimIsStale` is false at 1 minute and true at 3 minutes.
- [ ] Run them. Expected: FAIL.
- [ ] Implement the policy, then `getPublicRecap`, in this order:
  1. `lookupAccount`.
  2. Return `missing` or `organization` when it says so.
  3. Return `hidden` if the account id is in `hidden_accounts`.
  4. Serve the stored recap if it is fresh.
  5. Otherwise check the client limit, then the quota.
  6. Claim the fetch with one `UPDATE … SET fetching_since = now() WHERE fetching_since IS NULL OR fetching_since < now() - 2 min RETURNING` on an upserted row. If someone else holds the claim, poll the row every 2 s until `fetched_at` moves past the claim time, for at most 60 s, then return `busy`.
  7. Fetch the year, and fetch the previous year only when `previous` is null. Build, store, and clear `fetching_since`.
  8. On any error, clear `fetching_since`, store nothing, and return `error`.

  Record one row in `public_lookups` only when a real fetch starts.
- [ ] Add the env var to the deployment guide: how to create the fine-grained PAT ("Public repositories (read-only)", on the machine account), and a renewal reminder before it expires.
- [ ] Run `bun test`, `bun run typecheck` and `bun run lint`. Apply the migration to the local dev database (`bun scripts/dev-db.ts`, then `cd apps/web && bunx drizzle-kit migrate`).
- [ ] Commit `feat(web): fetch, store and serve public recaps`.

### Task 4: `/<username>` plays the story

Load the antislop skills first.

**Files:**

- Create: `apps/web/src/app/[username]/page.tsx`, `loading-screen.tsx`, `result-pages.tsx`, and `opengraph-image.tsx` (moved from `u/[login]`)
- Create: `apps/web/src/server/routes.ts` + `routes.test.ts`
- Modify:
  - `app/u/[login]/page.tsx` (redirect, or serve a reserved name)
  - `app/recap/page.tsx` (redirect)
  - `app/api/auth/callback/github/route.ts` (redirect to `/${login}`)
  - `server/recaps.ts` (`isStale` for the owner's auto-sync)
  - `app/sitemap.ts`, `app/robots.ts`

**Interfaces:**

- Consumes: Task 3 (`getPublicRecap`, `clientKey`), the existing `getCurrentUser`, `getRecap`, `syncRecap`, `getPrivateNamesChoice` and `storyData`, and `WorldPlayer` (owner and public variants).
- Produces:
  - `RESERVED: ReadonlySet<string>`, the top-level segments of `app/`, compared lower-cased.
  - `isReserved(name: string): boolean`
  - `viewerKind(signedInLogin: string | null, pageLogin: string): "owner" | "visitor"`, a case-insensitive comparison.

- [ ] **Write failing tests in `routes.test.ts`:**
  - `isReserved("Settings")` is true; `isReserved("habibiahmada")` is false.
  - Every top-level folder in `apps/web/src/app` except `[username]` is in `RESERVED`. Read the directory in the test so a new route can't be forgotten.
  - `viewerKind("HabibiAhmada", "habibiahmada")` is `"owner"`; `viewerKind(null, "x")` and `viewerKind("a", "b")` are `"visitor"`.
- [ ] Run them. Expected: FAIL.
- [ ] Implement the page.
  - The shell renders at once; a `Suspense` boundary with the loading screen wraps the data part.
  - **Owner:** if their recap is missing or stale, call `syncRecap` inside the boundary, then follow the existing `/recap` logic (question, then the owner player).
  - **Visitor:** call `getPublicRecap(username, clientKey(headers))`, then render either the public player or the matching result page:
    - "No GitHub user called @x", with the username field to try again;
    - the organisation message;
    - "@x has hidden their recap";
    - "The server is busy, try again in a few minutes";
    - a limit message;
    - an error with a retry link to the same URL.
  - A non-canonical case redirects to the canonical login.
  - The loading screen says what is happening ("Reading @x's 2026 on GitHub…"), with the loading Cell and a reduced-motion-safe animation.
- [ ] Move the OG image to `[username]` with `getPublicRecap` (public data only), keeping its existing look.
- [ ] Run the checks and `cd apps/web && bunx next build`. Expected: `/[username]` builds, and static routes still win.
- [ ] Commit `feat(web): every username has a recap at /<username>` and `feat(web): sign-in goes straight to your story`.

### Task 5: Visitors can keep the public recap

Load the antislop skills first.

**Files:** Modify `apps/web/src/app/recap/world-player.tsx` and the public end screen (from phase 4, `u/[login]/public-story.tsx` or its replacement under `[username]`).

**Interfaces:**

- Consumes: the `WorldPlayer` public variant and `ExportPanel`.
- Produces: the public variant shows the "Keep your year" end screen with `ExportPanel` fed the public data. The reminder never appears there, since `privateNames` is false. Under the panel are two links: "Make your own" (`/`) and "Sign in for your full recap" (sign-in route).

- [ ] Write a failing test for the end-screen choice: `endScreenFor("public")` includes exports and both links; `endScreenFor("owner")` keeps "Go to dashboard". Put the pure helper next to the player.
- [ ] Implement it. The renderer chunk still loads lazily; check the `/[username]` client manifest after the build.
- [ ] Run the checks and the build.
- [ ] Commit `feat(web): visitors can download and share a public recap`.

### Task 6: Hide, delete, and the end of opt-in sharing

Load the antislop skills first.

**Files:**

- Modify:
  - `app/settings/page.tsx`: a "Public recap" section with the "Hide my public recap" switch, via a server action in `app/settings/actions.ts`;
  - `server/auth.ts`, `deleteAccount`: call `setHidden(githubId, true)` and `forgetPublicRecap(githubId)`;
  - the dashboard: remove `ShareSection` and the "Publish" action, and point "Play your story" at `/<login>`; an empty dashboard redirects to `/<login>`;
  - `server/recaps.ts`: drop `isShared`, `setShared` and the `recap_shares` reads;
  - the schema: drop `recap_shares`, with a migration;
  - the landing page: the hero gets the username field (a `<form action="/go">` whose route handler redirects to `/<username>`, or client-side navigation) plus the sign-in button; "What you keep" and the FAQ lose the opt-in wording;
  - the privacy page, README and `docs/architecture/overview.md`.
- Create: `docs/architecture/decisions/0019-every-username-has-a-recap.md`. It amends ADR-0017's public page, replaces opt-in sharing, and records the token choice, the no-pool rule and the hide switch.

**Interfaces:**

- Consumes: Task 3 (`isHidden`, `setHidden`, `forgetPublicRecap`).
- Produces: `normalizeUsername(input: string): string | null`. It trims, strips a leading `@` and a `github.com/` prefix, and accepts only GitHub's login pattern `^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$`.

- [ ] **Write failing tests for `normalizeUsername`:**
  - `" @Octo "` becomes `"Octo"`; `"https://github.com/octo"` becomes `"octo"`.
  - `"-bad"`, `"a--"`, `""`, `"a b"` and a 40-character name give `null`.
- [ ] Run them. Expected: FAIL.
- [ ] Implement everything in the file list. Note that the account's GitHub id is available as `users.githubId`.
- [ ] Run the checks and the build.
  - `rg -n "recapShares|isShared|setShared|Publish my recap" apps` returns nothing.
  - `rg -n "Nothing goes public until|Off until you publish" apps README.md docs` returns nothing outside history.
- [ ] Commits:
  - `feat(web): owners can hide their public recap`
  - `refactor(web): drop opt-in sharing`
  - `feat(web): make a recap from the landing page`
  - `docs: ADR-0019, every username has a recap`

### Task 7: End-to-end browser check (controller)

No files; any fix found here becomes its own `fix(...)` commit.

- [ ] **Signed out, `/<a real public username>`:**
  1. The loading screen appears, then the story with "Public GitHub activity only".
  2. The end screen offers exports, and an MP4 or ZIP downloads.
  3. A second visit within 12 hours starts the story immediately: no loading screen, and the server logs show no GitHub fetch.
- [ ] **Edge cases:**
  - `/<nonexistent-name>` shows the missing page.
  - `/github` (an organisation) shows the organisation message.
  - `/settings` stays the settings page.
  - `/HabibiAhmada` redirects to the canonical case.
- [ ] **Owner:**
  1. Sign in with a synthetic owner (as in phase 4). The sign-in lands on `/<login>`, the private-names question shows, then the full story, then "Keep your year", then the dashboard.
  2. Hide the public recap in Settings. A signed-out visit shows "@x has hidden their recap"; the owner still sees the full recap.
- [ ] **Old links:** `/u/<login>` and `/recap` redirect.
- [ ] **Quality:** the console is clean, and the layout works at 375 px and on desktop.

---

## After this plan

A PR `feat: a recap for any GitHub username` with `Closes #<issue>`. Then, from the story-world spec's list: sign-in with organisation access, and head-only Cell on the loading and landing pages.
