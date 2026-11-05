# Deployment

How to run WrapYourGit outside a laptop. For local development see [development/setup.md](../development/setup.md).

> **Status (2026-11-05):** production is **live on Vercel** at `https://wrapyourgit.habibiahmada.dev`: sign-in, sync and the story work there ([ADR-0015](../architecture/decisions/0015-production-on-vercel-first.md)). The AWS VPS below is the later home for production (ADR-0005), not set up yet. Steps not yet run against a real platform are marked **Not yet verified**.

## What runs where

| Piece                                  | Now (Vercel)                                      | Later (AWS VPS, ADR-0005)                |
| -------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| Web app (`apps/web`, Next.js 16)       | Vercel Hobby, functions in Singapore (`sin1`)     | `next start` behind Caddy (HTTPS)        |
| Database (Postgres)                    | Neon `wrapyourgit-db`, Singapore, free plan       | Postgres container on the same VPS       |
| Slide exports (PNG, ZIP, PDF)          | **Hidden** (routes answer 503)                    | On the VPS: Bun worker + headless Chrome |
| MP4 export (Remotion Lambda, ADR-0004) | Not wired to the UI yet                           | Not wired to the UI yet                  |
| GitHub sign-in                         | GitHub App `wrapyourgit` (public)                 | The same app                             |
| DNS                                    | Cloudflare `CNAME wrapyourgit` → Vercel, DNS only | `A` record → the VPS                     |

Why slide exports differ: slides are frames of the story composition, rendered by a separate Bun process with headless Chrome ([ADR-0011](../architecture/decisions/0011-slides-from-the-composition.md)). A serverless function has neither, so on Vercel the story's export step offers only the share card and the letter slide (both next/og, which works there) and says why the PDF and chapter slides are missing. The PDF, ZIP and chapter slide routes answer `503 Slide exports can't be rendered on this server right now` without trying a render. The switch is `SLIDE_EXPORTS` (table below); Vercel needs no setting. Everything else works there. Moving the slides to `renderStillOnLambda` is the planned fix.

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
| `SLIDE_EXPORTS`                                                                                                                     | no       | `on` or `off`: whether this host renders chapter slides. Unset: off on Vercel (`VERCEL=1`), on elsewhere.                                                     |
| `AWS_REGION`, `REMOTION_AWS_ACCESS_KEY_ID`, `REMOTION_AWS_SECRET_ACCESS_KEY`, `REMOTION_LAMBDA_FUNCTION_NAME`, `REMOTION_SERVE_URL` | not yet  | For MP4 rendering on Lambda, once it is wired to the UI.                                                                                                      |

`GITHUB_TOKEN` in `.env.example` is for local spikes only; don't set it on a server.

On Vercel, `DATABASE_URL` comes from the Neon integration (Production and Preview); `APP_URL` is set for Production and Preview; `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY` are set for **Production only**, so preview deployments build but can't sign anyone in. For previews the Neon integration replaces `DATABASE_URL` with a **database branch of their own** ("Create Database Branch For Deployment: Preview"), so a preview never touches production data. The branches are named `preview/<git branch>` and show in the Neon console (Vercel → Storage → wrapyourgit-db → Open in Neon → Branches). The free plan caps the number of branches: if a preview fails to get a database, delete old `preview/*` branches there. The two secrets are Vercel _Secret_ variables, entered by the maintainer.

## GitHub App

One GitHub App, `wrapyourgit` (App ID 5604815), serves both local development and production: it lists both callback URLs, `http://localhost:3000/api/auth/callback/github` and `https://wrapyourgit.habibiahmada.dev/api/auth/callback/github`, and each environment uses its own client secret (GitHub allows several). It is **public**, which GitHub requires for anyone other than its owner to sign in. Settings, as in [development/setup.md](../development/setup.md#github-app-m2):

- **Homepage:** `https://wrapyourgit.habibiahmada.dev`
- **Expire user authorization tokens:** on. **Webhook:** off. **Repository permissions:** none; Metadata: read only if you use the optional install (ADR-0006, ADR-0008).
- A separate app per environment is still possible; it would need its own name (users see it on GitHub's consent screen).

## Database migrations

Migrations live in `apps/web/drizzle`. On Vercel the build command runs them first (`bun run db:migrate && bun run build`), so every deployment migrates before it builds. Production migrates the production database; a preview migrates its own Neon branch. Elsewhere, apply them from any machine that can reach the database, before the new code goes live:

```bash
DATABASE_URL='<connection string>' bun run --filter @wyg/web db:migrate
```

Migrations only add; to roll back the code, keep the schema and deploy the previous version.

## Production now: Vercel + Neon

What is set up, and how to set it up again:

1. **Vercel project** `wrapyourgit` (team "mainan bheeboyy", Hobby), imported from `habibiahmada/wrapyourgit`:
   - Root Directory: `apps/web`, with "Include files outside the root directory" on (the app imports `packages/*` and `apps/renderer`).
   - Install command: `cd ../.. && bun install --frozen-lockfile` (the whole workspace, from the repository root).
   - Build command: `bun run db:migrate && bun run build`. `build` first copies `art`, `audio`, `lang`, `photos` and `sprites` from `packages/video/public` into `apps/web/public` (`scripts/sync-web-public.ts`): symlinks there made Vercel's output step fail.
   - Settings → Functions → Function Region: Singapore (`sin1`), next to the database.
   - Every push to `main` deploys production; other branches get preview deployments.
2. **Neon** through Vercel → Storage → Create Database → Neon: region Singapore, free plan, Neon Auth off, connected to the project with the variable prefix `DATABASE` (so the pooled string is `DATABASE_URL`).
3. **Environment variables** as in the table and scopes above.
4. **Rate limit:** Vercel → Firewall → Rules → "Rate limit /api and /u/ endpoints": paths starting with `/api` or `/u/`, fixed window of 60 seconds, 60 requests per IP, then **429**, published to production. Firewall changes apply without a redeploy; after a change, use Review Changes → Publish.
5. **Domain:** Vercel → Domains → add `wrapyourgit.habibiahmada.dev`; Vercel shows a project-specific CNAME target. In Cloudflare (zone `habibiahmada.dev`): `CNAME wrapyourgit → <that target>`, proxy **off** (DNS only), so Vercel terminates TLS and issues the certificate.

Verified on 2026-11-05: the site, the copied static folders (`/art`, `/sprites`, `/photos`, `/lang`), `robots.txt`, `sitemap.xml`, the Open Graph image, HSTS (sent by Vercel), sign-in with the GitHub App, a full sync (about 20 seconds) into Neon, and the dashboard, with no console errors.

Also verified on 2026-11-05: the export routes answer `503 Slide exports can't be rendered on this server right now`, not 500. The story's export step still offers the PNG, ZIP and PDF buttons there; they need hiding or a Lambda backend.

## Later: production on an AWS VPS

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

**Not yet verified:**

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
- [ ] Every **Not yet verified** item above confirmed and removed from this guide.
