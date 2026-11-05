# Deployment

How to run WrapYourGit outside a laptop. For local development see [development/setup.md](../development/setup.md).

> **Status (2026-11-05):** nothing is deployed yet; `wrapyourgit.habibiahmada.dev` has no DNS record. This guide follows the plan in [ADR-0005](../architecture/decisions/0005-environments-and-hosting.md) with the code as it is today. Steps that have not been run against the real platform are marked **Check on first deploy**: confirm them, then remove the mark.

## What runs where

| Piece                                  | Staging                 | Production                                 |
| -------------------------------------- | ----------------------- | ------------------------------------------ |
| Web app (`apps/web`, Next.js 16)       | Vercel Hobby            | AWS VPS: `next start` behind Caddy (HTTPS) |
| Database (Postgres 16)                 | Neon free tier          | Postgres container on the same VPS         |
| Slide exports (PNG, ZIP, PDF)          | **Unavailable** (503)   | On the VPS: Bun worker + headless Chrome   |
| MP4 export (Remotion Lambda, ADR-0004) | Not wired to the UI yet | Not wired to the UI yet                    |
| GitHub sign-in                         | GitHub App, staging URL | GitHub App, production URL                 |

Why slide exports differ: slides are frames of the story composition, rendered by a separate Bun process with headless Chrome ([ADR-0011](../architecture/decisions/0011-slides-from-the-composition.md)). A serverless function has neither, so on Vercel the export routes answer `503 Slide exports can't be rendered on this server right now`. Everything else works there. Moving the slides to `renderStillOnLambda` is the planned fix.

## Environment variables

The template is [`.env.example`](../../.env.example). The web app reads these; set them per environment, never commit real values.

| Variable                                                                                                                            | Required | Notes                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                                                                                                           | yes      | Origin, no trailing slash, e.g. `https://wrapyourgit.habibiahmada.dev`. Drives OAuth callbacks, canonical URLs, the sitemap and secure cookies (`https://`).  |
| `DATABASE_URL`                                                                                                                      | yes      | Postgres connection string. On Neon, use the **pooled** string with `sslmode=require`.                                                                        |
| `TOKEN_ENCRYPTION_KEY`                                                                                                              | yes      | 32 random bytes, base64: `openssl rand -base64 32`. Encrypts GitHub tokens at rest. **Changing it makes every stored token unreadable:** users sign in again. |
| `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`                                                                                  | yes      | From the GitHub App for that environment.                                                                                                                     |
| `GITHUB_APP_SLUG`                                                                                                                   | no       | The app's URL slug; enables the optional install for private repositories (ADR-0008).                                                                         |
| `BUN_BIN`                                                                                                                           | no       | Path to `bun` for the slide worker when it isn't on `PATH` (VPS only).                                                                                        |
| `REMOTION_GL`                                                                                                                       | no       | WebGL backend for slide renders. Set `swangle` on a server without a GPU.                                                                                     |
| `AWS_REGION`, `REMOTION_AWS_ACCESS_KEY_ID`, `REMOTION_AWS_SECRET_ACCESS_KEY`, `REMOTION_LAMBDA_FUNCTION_NAME`, `REMOTION_SERVE_URL` | not yet  | For MP4 rendering on Lambda, once it is wired to the UI.                                                                                                      |

`GITHUB_TOKEN` in `.env.example` is for local spikes only; don't set it on a server.

## GitHub App per environment

Create one GitHub App per environment (staging, production) as in [development/setup.md](../development/setup.md#github-app-m2), with:

- **Callback URL:** `<APP_URL>/api/auth/callback/github`
- **Expire user authorization tokens:** on. **Webhook:** off. **Repository permissions:** none; Metadata: read only if you use the optional install (ADR-0006, ADR-0008).
- Copy the Client ID and a new client secret into that environment's variables.

## Database migrations

Migrations live in `apps/web/drizzle` and are applied from any machine that can reach the database, before the new code goes live:

```bash
DATABASE_URL='<connection string>' bun run --filter @wyg/web db:migrate
```

Migrations only add; to roll back the code, keep the schema and deploy the previous version.

## Staging: Vercel + Neon

1. **Neon:** create a project (Postgres 16), copy the pooled connection string, and run the migrations against it (above).
2. **Vercel:** import the GitHub repository and set:
   - Root Directory: `apps/web` (keep "Include files outside the root directory" on: the app imports `packages/*` and `apps/renderer`). `apps/web` copies `art`, `audio`, `lang`, `photos` and `sprites` from `packages/video/public` into its `public` folder before `dev` and `build` (`scripts/sync-web-public.ts`); they used to be symlinks, which Vercel's output step can't copy.
   - Install command: `bun install --frozen-lockfile`. Build command: `bun run build`.
   - Environment variables from the table above, with `APP_URL` set to the staging URL.
3. Deploy, then sign in with the staging GitHub App.

**Check on first deploy:**

- Vercel installs from the repository root (Bun workspaces) and the copied `public` folders are served: `/art/hero-cast.webp`, `/sprites/wave.webp` and `/audio/` files load with 200.
- A sync (about 20 seconds against GitHub) finishes within the plan's function time limit.
- The export routes answer 503 with the message above, not 500.

## Production: AWS VPS

A single Linux VPS (Ubuntu 24.04 assumed) runs the web app, the slide worker and Postgres.

### 1. Server

```bash
# Node 22 (Next.js runs on Node) and Bun (workspace scripts, the slide worker)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs
curl -fsSL https://bun.sh/install | bash
# Docker for Postgres, Caddy for HTTPS
sudo apt-get install -y docker.io caddy
# Libraries headless Chrome needs for slide exports
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2
```

Create a user `wyg` that owns `/srv/wrapyourgit` and runs the app. Open only ports 22, 80 and 443.

### 2. Postgres

```bash
sudo docker run -d --name wyg-postgres --restart unless-stopped \
  -e POSTGRES_USER=wyg -e POSTGRES_PASSWORD='<strong password>' -e POSTGRES_DB=wrapyourgit \
  -v wyg-postgres-data:/var/lib/postgresql/data -p 127.0.0.1:5432:5432 postgres:16
```

Bound to `127.0.0.1` only. `DATABASE_URL=postgres://wyg:<password>@127.0.0.1:5432/wrapyourgit`.

### 3. App

```bash
sudo -u wyg git clone https://github.com/habibiahmada/wrapyourgit.git /srv/wrapyourgit
cd /srv/wrapyourgit
sudo -u wyg git checkout v<version>          # deploy a release tag, not a moving branch
sudo -u wyg bun install --frozen-lockfile
```

Put the variables in `/etc/wrapyourgit.env` (owner root, mode `600`), with `REMOTION_GL=swangle` and `BUN_BIN=/home/wyg/.bun/bin/bun`. Then migrate and build:

```bash
set -a; . /etc/wrapyourgit.env; set +a
bun run --filter @wyg/web db:migrate
bun run build
```

`bun install` also points `core.hooksPath` at `.githooks` in this checkout; harmless on a server that never commits.

### 4. Service

`/etc/systemd/system/wrapyourgit.service`:

```ini
[Unit]
Description=WrapYourGit web
After=network-online.target docker.service

[Service]
User=wyg
WorkingDirectory=/srv/wrapyourgit/apps/web
EnvironmentFile=/etc/wrapyourgit.env
Environment=NODE_ENV=production PORT=3000
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now wrapyourgit
```

### 5. HTTPS

`/etc/caddy/Caddyfile`:

```
wrapyourgit.habibiahmada.dev {
  encode zstd gzip
  # The app sends no HSTS header itself; Caddy adds it.
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
  reverse_proxy 127.0.0.1:3000
}
```

Point the domain's `A` record at the VPS, then `sudo systemctl reload caddy`; Caddy gets the certificate itself.

**Check on first deploy:**

- The first slide export downloads Chrome Headless Shell (Remotion's `ensureBrowser`) and bundles the composition: tens of seconds. Later exports take a few seconds each. If Chrome fails to start, the service log (`journalctl -u wrapyourgit`) names the missing library.
- `curl -I https://wrapyourgit.habibiahmada.dev` returns 200 with `Strict-Transport-Security`.

### Update and roll back

```bash
cd /srv/wrapyourgit
sudo -u wyg git fetch --tags && sudo -u wyg git checkout v<new version>
sudo -u wyg bun install --frozen-lockfile
set -a; . /etc/wrapyourgit.env; set +a
bun run --filter @wyg/web db:migrate && bun run build
sudo systemctl restart wrapyourgit
```

To roll back, check out the previous tag and repeat without the migrate step.

### Backups

```bash
# /etc/cron.daily/wyg-backup  (keep 14 days, copy off the server, e.g. to S3)
docker exec wyg-postgres pg_dump -U wyg -Fc wrapyourgit > /var/backups/wyg-$(date +%F).dump
find /var/backups -name 'wyg-*.dump' -mtime +14 -delete
```

Restore with `pg_restore -U wyg -d wrapyourgit --clean <file>` inside the container. Test a restore before launch.

## MP4 rendering (Remotion Lambda)

The Lambda function and the video site are deployed with `bun run --filter @wyg/renderer deploy` (see [development/setup.md](../development/setup.md#aws-for-remotion-lambda-spike-b--m5)), which prints `REMOTION_LAMBDA_FUNCTION_NAME` and `REMOTION_SERVE_URL`. Redeploy the site after any change in `packages/video`. The web app doesn't start renders yet (the MP4 button is disabled); this section grows when it does.

## Before launch

From ADR-0005 and ADR-0011:

- [ ] AWS Budget alert set (e.g. $20/month), before rendering anything on Lambda.
- [ ] Cost per render measured; per-user daily render limit decided.
- [ ] Slide exports moved to `renderStillOnLambda`, or the 503 accepted on any serverless host.
- [ ] Database backup restored once on a scratch database.
- [ ] Repository public and `bun scripts/github-settings.ts` run, so `main` is protected (ADR-0014).
- [ ] Every **Check on first deploy** above confirmed and removed from this guide.
