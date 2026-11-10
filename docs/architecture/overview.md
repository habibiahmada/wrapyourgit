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

**Story:** `/recap` plays the story world (`WorldStory` in `@wyg/video`, `recap/world-player.tsx`): one stop after another through the year as a city, ending with the congratulations letter (`congratsLetter` in `@wyg/video/letter`, every sentence from a real number) and "Keep your year". Before the first visit it asks once whether to show private repository names (`users.show_private_names`, changeable in Settings; [ADR-0017](decisions/0017-private-names-follow-the-owner.md)).

**Export:** in the viewer's browser ([ADR-0016](decisions/0016-exports-in-the-browser.md)): `ExportPanel` loads `recap/exports.ts` on demand and renders the MP4 (`renderMediaOnWeb`, one of the four formats) or one 4:5 PNG per stop (`renderStillOnWeb`), assembled into a ZIP or PDF. The files use the owner's projection (ADR-0017). No server, job table or storage is involved.

**Public page:** `/u/<login>` (login matched case-insensitively) renders `toPublicRecap()` from `@wyg/analytics` only when a `recap_shares` row exists. Private repos are removed from every named field; aggregate counts stay; the timezone and commit-hour histogram are withheld. Publishing requires a sync from the last 24 h, because privacy flags are as of the last sync. The card PNG is cached per user and sync time (`cardPng`), while the share check runs on every request. The same projection feeds `opengraph-image` and the downloadable card at `/api/card` (`server/card.tsx`, `next/og`, 1200×630). An unknown or unshared login gets `notFound()`: the OG image returns a real 404, while the page streams a 404 view with HTTP 200 because the lookup sits behind `<Suspense>` (Cache Components).

**Logins:** GitHub logins can be renamed and later reused by someone else. A unique index on `lower(login)` guarantees `/u/<login>` resolves to one person, and sign-in hands the login over in one transaction: an older row still holding it gets the placeholder `~<github_id>` (`~` never appears in GitHub logins) until that person signs in again.

## Data model (Drizzle, `apps/web/src/server/db/schema.ts`)

Built in M2: `users` (GitHub identity keyed by numeric `github_id`; one GitHub account per user, so there is no separate accounts table) · `github_tokens` (access + refresh token, AES-256-GCM, with expiry times) · `sessions` (SHA-256 of the cookie token, 30 days) · `recaps` (user, year, schemaVersion, data JSONB, isFinal, syncedAt; a row from an older schema version reads as missing). Every child table cascades on user delete.

Added in M5: `recap_shares` (user, year; a row means published, so sharing is off by default). Added in phase 4 of the story world: `users.show_private_names` (nullable; null until the owner answers, ADR-0017).

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
| preview    | Vercel preview deployments           | the production Neon database  | the viewer's browser                                                    |
| production | Vercel Hobby (`sin1`); AWS VPS later | Neon, Singapore               | the viewer's browser                                                    |
