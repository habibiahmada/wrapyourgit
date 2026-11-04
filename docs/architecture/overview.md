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
            │  export:  apps/renderer.startRender() ──▶ Remotion Lambda ──▶ S3 (MP4)    │
            └───────────────────────────────────────────────────────────────────────────┘
                         packages/video is used by BOTH the Player and Lambda
```

## Modules

| Package     | Responsibility                                         | May depend on            | Must not                                                              |
| ----------- | ------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------- |
| `schema`    | `RecapData` zod schema, video formats, layout families | zod                      | import anything app-specific                                          |
| `github`    | Fetch from GitHub; raw API types                       | schema                   | compute metrics, touch DB                                             |
| `analytics` | Pure transforms raw → `RecapData`                      | schema                   | do I/O, read env, call fetch                                          |
| `video`     | Remotion scenes/compositions                           | schema, remotion, react  | fetch data, use non-deterministic animation                           |
| `renderer`  | Deploy Lambda; start/poll renders                      | schema, @remotion/lambda | import video source at runtime (Lambda uses the deployed site bundle) |
| `web`       | UI, auth, API routes, persistence, orchestration       | all of the above         | send tokens to the client                                             |

## Key flows

**Sync:** user signs in → server fetches with the user's token (contributions, repos, PR/issue details, stargazers for owned repos) → analytics builds `RecapData` → validated with `recapDataSchema.parse` → stored as JSON in `recaps` (versioned by `schemaVersion`). Raw responses may be cached briefly to allow recomputation; source code is never fetched.

**Story:** `/recap` loads `RecapData` and renders `<Player component={WrapStory} />` with composition size chosen from the viewport (`layoutForSize`). Tap/click seeks to the next scene boundary from `SCENES`.

**Export:** user picks format + soundtrack → API creates a render job row → `startRender()` → poll `getRenderStatus()` → MP4 in S3 (private, signed download URL, lifecycle expiry).

**Public page:** `/u/<login>` reads a _public projection_ of `RecapData` (private repos redacted) only if the user enabled sharing.

## Data model (Drizzle, `apps/web/src/server/db/schema.ts`)

Built in M2: `users` (GitHub identity keyed by numeric `github_id`; one GitHub account per user, so there is no separate accounts table) · `github_tokens` (access + refresh token, AES-256-GCM, with expiry times) · `sessions` (SHA-256 of the cookie token, 30 days) · `recaps` (user, year, schemaVersion, data JSONB, isFinal, syncedAt; a row from an older schema version reads as missing). Every child table cascades on user delete.

Planned for M5: `render_jobs` (recap, format, soundtrack, status, renderId, s3Key, error) · `recap_shares` (public toggle, slug).

## Auth and sync (M2)

- Sign-in: `/api/auth/signin` sets a 10-minute httpOnly cookie holding state + PKCE verifier and redirects to GitHub. `/api/auth/callback/github` checks state (constant-time), exchanges the code with the client secret, upserts the user, stores tokens encrypted and starts a session.
- Access tokens are refreshed 5 minutes before expiry (`tokenState` in `server/oauth.ts`). A failed refresh asks the user to sign in again.
- State-changing route handlers (`signout`, `account/delete`) reject a foreign or missing `Origin`; session cookies are `SameSite=Lax`.
- Sync is a server action: session check, 10-minute cooldown, `fetchYearActivity` → `buildRecap` → `recapDataSchema.parse` → upsert.
- With Cache Components, every session read sits behind `<Suspense>`; pages that use the current time call `connection()`.

Statistics live inside `recaps.data` as one validated document rather than in many stat tables: everything is recomputable from GitHub, and the schema is the single contract.

## Environments

See [ADR-0005](decisions/0005-environments-and-hosting.md).

| Env        | Web                             | DB                            | Rendering                          |
| ---------- | ------------------------------- | ----------------------------- | ---------------------------------- |
| local      | `bun run dev`                   | local Postgres or Neon branch | Remotion CLI locally               |
| staging    | Vercel (preview/hobby)          | Neon free                     | Remotion Lambda (same AWS account) |
| production | AWS (EC2/Lightsail VPS, Docker) | Postgres on AWS               | Remotion Lambda                    |
