# Development setup

## Prerequisites

- Bun ≥ 1.4, Node ≥ 22 (Next.js and Remotion tooling)
- Git, GitHub CLI (`gh`) for the data spike
- Remotion downloads its own Chrome Headless Shell and FFmpeg on first render; no system FFmpeg needed.

## First run

```bash
bun install
bun run dev        # http://localhost:3000
bun run studio     # Remotion Studio, all four compositions with sample data
bun test           # unit tests
```

## Environment variables

Template: [`.env.example`](../../.env.example). Next.js reads `apps/web/.env.local`; scripts read `.env` at the repo root (Bun loads it automatically). Never commit real values.

## GitHub data spike (no app needed)

```bash
GITHUB_TOKEN=$(gh auth token) bun scripts/spike-github.ts
```
Raw JSON lands in `.data/` (gitignored, may contain private repo names).

## Local database

```bash
bun scripts/dev-db.ts                      # Postgres 16 on localhost:54329 (podman or docker)
bun run --filter @wyg/web db:migrate       # apply migrations in apps/web/drizzle
```

After changing `apps/web/src/server/db/schema.ts`, run `bun run --filter @wyg/web db:generate` and commit the new migration. Stop the container with `bun scripts/dev-db.ts --stop`; data persists in the `wyg-postgres-data` volume.

## Web sign-in locally

`apps/web/.env.local` needs `APP_URL`, `DATABASE_URL`, `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`), `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET` (GitHub App → Credentials → Client secrets → New secret). Restart `bun run dev` after editing it; a running dev server may keep the old values.

## GitHub App (M2)

1. GitHub → Settings → Developer settings → GitHub Apps → New.
2. Callback URL: `http://localhost:3000/api/auth/callback/github` (+ staging/prod URLs).
3. Enable _Expire user authorization tokens_ and _Enable Device Flow_ (used by the token script below). Untick _Webhook → Active_. Request **no repository permissions**. Account permissions: none required for MVP (see [ADR-0006](../architecture/decisions/0006-github-app-auth.md)).
4. Put Client ID/secret in `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET`.

To run the data spike with a real sign-in token instead of your `gh` token:

```bash
GITHUB_APP_CLIENT_ID=<client id> bun scripts/github-app-token.ts
GITHUB_TOKEN=$(cat .data/github-app-token) SPIKE_LABEL=app bun scripts/spike-github.ts
```

## Workflow with an AI agent

- Agents start from [AGENTS.md](../../AGENTS.md).
- One task = one branch = one PR; conventional commit messages.
- Definition of done: `bun run typecheck && bun test && bun run lint` pass, and the docs in the same area are updated.
