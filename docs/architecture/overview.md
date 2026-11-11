# Architecture overview

## Shape

```
            ┌─────────────────────────── apps/web (Next.js) ───────────────────────────┐
 Browser ──▶│ landing · GitHub sign-in · dashboard · story (@remotion/player) · public │
            │                                                                           │
            │  server only:  sync job ──▶ packages/github ──▶ GitHub GraphQL API        │
            │                    │                                                     │
            │                    ▼                                                     │
            │               packages/analytics ──▶ RecapData (packages/schema) ──▶ Postgres
            │                                                                           │
            │  export:  in the browser, @remotion/web-renderer ──▶ MP4, PNG, ZIP, PDF   │
            └───────────────────────────────────────────────────────────────────────────┘
                 packages/video is used by BOTH the Player and the browser export
```

## Modules

| Package     | Responsibility                                         | May depend on           | Must not                                    |
| ----------- | ------------------------------------------------------ | ----------------------- | ------------------------------------------- |
| `schema`    | `RecapData` zod schema, video formats, layout families | zod                     | import anything app-specific                |
| `github`    | Fetch from GitHub; raw API types                       | schema                  | compute metrics, touch DB                   |
| `analytics` | Pure transforms raw → `RecapData`                      | schema                  | do I/O, read env, call fetch                |
| `video`     | Remotion scenes/compositions                           | schema, remotion, react | fetch data, use non-deterministic animation |
| `web`       | UI, auth, API routes, persistence, orchestration       | all of the above        | send tokens to the client                   |

## Key flows

**Sync:** user signs in → server fetches with the user's token (contributions, repos, PR/issue details, stargazers for owned repos) → analytics builds `RecapData` → validated with `recapDataSchema.parse` → stored as JSON in `recaps` (versioned by `schemaVersion`). Raw responses may be cached briefly to allow recomputation; source code is never fetched.

**Story:** the owner's own `/<login>` plays the story world (`WorldStory` in `@wyg/video`, `recap/world-player.tsx`): one stop after another through the year as a city, ending with the congratulations letter (`congratsLetter` in `@wyg/video/letter`, every sentence from a real number) and "Keep your year". Before the first visit it asks once whether to show private repository names (`users.show_private_names`, changeable in Settings; [ADR-0017](decisions/0017-private-names-follow-the-owner.md)).

**Export:** in the viewer's browser ([ADR-0016](decisions/0016-exports-in-the-browser.md)): `ExportPanel` loads `recap/exports.ts` on demand and renders the MP4 (`renderMediaOnWeb`, one of the four formats) or one 4:5 PNG per stop (`renderStillOnWeb`), assembled into a ZIP or PDF. The files use the owner's projection (ADR-0017). No server, job table or storage is involved.

**Public recap ([ADR-0019](decisions/0019-every-username-has-a-recap.md)):** every GitHub username has a recap at `/<username>` (`app/[username]`). The signed-in owner on their own address gets their full recap, auto-synced when it is missing or older than 12 hours. Everyone else gets the public recap: `loadPublicRecap` in `server/public-recaps.ts` fetches the account with the server's `GITHUB_PUBLIC_TOKEN` (a fine-grained token limited to public repositories, read-only), builds it with `meta.scope = "public"`, stores `toPublicRecap()` of it in `public_recaps` keyed by GitHub id, and serves it for 12 hours. Last year's raw activity is kept for the comparison. One request fetches an account at a time (a claim on `public_recaps.fetching_since`); others wait for it. A client (a salted hash of its address in `public_lookups`) may start 20 lookups an hour, and new fetches stop while GitHub reports fewer than 300 points left; a stale stored recap is served instead, if it is less than 7 days old (`canServeStale`), and "busy" or "limited" otherwise. A name GitHub couldn't issue (`isValidLogin`) gets the missing page with no lookup. Owners can hide their public recap in Settings (`hidden_accounts`, by GitHub id); hiding and "Delete my data" also delete the stored public recap. Site routes win over usernames (`RESERVED` in `server/routes.ts`); a login that collides with one lives at `/u/<login>`, and `/u/<login>` otherwise redirects (308, `proxy.ts`) to `/<login>`. The landing field is a GET form to `/go`, which normalizes the input (`normalizeUsername`) and redirects. The page's OG image and the visitor's share card come from the same public recap; the owner's card at `/api/card` renders `toPublicRecap()` of their own recap (`server/card.tsx`, `next/og`, 1200×630). Recap pages are `noindex`, so crawlers don't spend lookups.

**Logins:** GitHub logins can be renamed and later reused by someone else. A unique index on `lower(login)` guarantees a signed-in login resolves to one account, and sign-in hands the login over in one transaction: an older row still holding it gets the placeholder `~<github_id>` (`~` never appears in GitHub logins) until that person signs in again. Public recaps and the hide list are keyed by GitHub id for the same reason.

## Data model (Drizzle, `apps/web/src/server/db/schema.ts`)

Built in M2: `users` (GitHub identity keyed by numeric `github_id`; one GitHub account per user, so there is no separate accounts table) · `github_tokens` (access + refresh token, AES-256-GCM, with expiry times) · `sessions` (SHA-256 of the cookie token, 30 days) · `recaps` (user, year, schemaVersion, data JSONB, isFinal, syncedAt; a row from an older schema version reads as missing). Every child table cascades on user delete.

Added in phase 4 of the story world: `users.show_private_names` (nullable; null until the owner answers, ADR-0017). Added for username recaps (ADR-0019): `public_recaps` (github_id, login, public data, last year's raw activity, fetched_at, fetching_since), `hidden_accounts` (github_id) and `public_lookups` (client hash, time). M5's opt-in `recap_shares` was dropped (migration 0007).

## Auth and sync (M2)

- Sign-in: `/api/auth/signin` sets a 10-minute httpOnly cookie holding state + PKCE verifier and redirects to GitHub. `/api/auth/callback/github` checks state (constant-time), exchanges the code with the client secret, upserts the user, stores tokens encrypted and starts a session.
- Access tokens are refreshed 5 minutes before expiry (`tokenState` in `server/oauth.ts`), inside a transaction holding `SELECT … FOR UPDATE` on the token row, because GitHub refresh tokens are single-use. A failed refresh asks the user to sign in again.
- State-changing route handlers (`signout`, `account/delete`) reject a foreign or missing `Origin`; session cookies are `SameSite=Lax`.
- Sync is a server action: session check, then an atomic claim on `users.sync_started_at` (10-minute cooldown; a failed sync releases it), then `fetchYearActivity` → `buildRecap` → `recapDataSchema.parse` → upsert. Server logs record error kind and status only (`server/log.ts`), never GitHub's message, which can name private repos.
- With Cache Components, every session read sits behind `<Suspense>`; pages that use the current time call `connection()`.

Statistics live inside `recaps.data` as one validated document rather than in many stat tables: everything is recomputable from GitHub, and the schema is the single contract.

## Environments

See [ADR-0005](decisions/0005-environments-and-hosting.md) and [ADR-0015](decisions/0015-production-on-vercel-first.md); the steps are in [deployment/guide.md](../deployment/guide.md). Production is live on Vercel since 2026-11-05.

| Env        | Web                                  | DB                            | Rendering                                                               |
| ---------- | ------------------------------------ | ----------------------------- | ----------------------------------------------------------------------- |
| local      | `bun run dev`                        | local Postgres or Neon branch | the browser; `scripts/lib/still.ts` and the Remotion CLI for dev stills |
| production | Vercel Hobby (`sin1`); AWS VPS later | Neon, Singapore               | the viewer's browser                                                    |
