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

## Planned data model (Drizzle, M2)

`users` · `github_accounts` · `oauth_tokens` (encrypted) · `recaps` (user, year, schemaVersion, data JSONB, isFinal, syncedAt) · `render_jobs` (recap, format, soundtrack, status, renderId, s3Key, error) · `recap_shares` (public toggle, slug).

Statistics live inside `recaps.data` as one validated document rather than in many stat tables: everything is recomputable from GitHub, and the schema is the single contract.

## Environments

See [ADR-0005](decisions/0005-environments-and-hosting.md).

| Env        | Web                             | DB                            | Rendering                          |
| ---------- | ------------------------------- | ----------------------------- | ---------------------------------- |
| local      | `bun run dev`                   | local Postgres or Neon branch | Remotion CLI locally               |
| staging    | Vercel (preview/hobby)          | Neon free                     | Remotion Lambda (same AWS account) |
| production | AWS (EC2/Lightsail VPS, Docker) | Postgres on AWS               | Remotion Lambda                    |
