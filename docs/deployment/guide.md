# Deployment

How to run WrapYourGit outside a laptop. For local development see [development/setup.md](../development/setup.md).

> **Status (2026-11-05):** production is **live on Vercel** at `https://wrapyourgit.com`: sign-in, sync and the story work there ([ADR-0015](../architecture/decisions/0015-production-on-vercel-first.md)). The AWS VPS below is the later home for production (ADR-0005), not set up yet. Steps not yet run against a real platform are marked **Not yet verified**.

## What runs where

| Piece                              | Now (Vercel)                                            | Later (AWS VPS, ADR-0005)          |
| ---------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| Web app (`apps/web`, Next.js 16)   | Vercel Hobby, functions in Singapore (`sin1`)           | `next start` behind Caddy (HTTPS)  |
| Database (Postgres)                | Neon `wrapyourgit-db`, Singapore, free plan             | Postgres container on the same VPS |
| Story exports (MP4, PNG, ZIP, PDF) | In the viewer's browser (ADR-0016)                      | The same                           |
| GitHub sign-in                     | GitHub App `wrapyourgit` (public)                       | The same app                       |
| DNS                                | Cloudflare `CNAME @` and `CNAME www` → Vercel, DNS only | `A` record → the VPS               |

No server renders the story: the MP4, slides, ZIP and PDF are made in the viewer's browser ([ADR-0016](../architecture/decisions/0016-exports-in-the-browser.md)), so every host serves them the same way and needs no render setup. The share card is next/og on the server, which works on Vercel.

## Environment variables

The template is [`.env.example`](../../.env.example). The web app reads these; set them per environment, never commit real values.

| Variable                                           | Required | Notes                                                                                                                                                         |
| -------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                          | yes      | Origin, no trailing slash, e.g. `https://wrapyourgit.com`. Drives OAuth callbacks, canonical URLs, the sitemap and secure cookies (`https://`).               |
| `DATABASE_URL`                                     | yes      | Postgres connection string. On Neon, use the **pooled** string with `sslmode=require`.                                                                        |
| `TOKEN_ENCRYPTION_KEY`                             | yes      | 32 random bytes, base64: `openssl rand -base64 32`. Encrypts GitHub tokens at rest. **Changing it makes every stored token unreadable:** users sign in again. |
| `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` | yes      | From the GitHub App for that environment.                                                                                                                     |
| `GITHUB_APP_SLUG`                                  | no       | The app's URL slug; enables the optional install for private repositories (ADR-0008).                                                                         |
| `GITHUB_PUBLIC_TOKEN`                              | yes      | Fine-grained PAT on the machine account, **Public repositories (read-only)**. Fetches the public recap at `/<username>`; see [Public token](#public-token).   |

`GITHUB_TOKEN` in `.env.example` is for local spikes only; don't set it on a server.

### Public token

Public recaps (anyone's recap at `/<username>`) are fetched with one server token, `GITHUB_PUBLIC_TOKEN`. It lives on **one machine account**, the single automation account GitHub allows next to a personal one. Never add a second token or account to get more quota: spreading requests over accounts breaks GitHub's terms. The app saves quota instead: a 12-hour cache, one fetch per account at a time, a per-client limit, a 10-minute memory of names GitHub says don't exist, and no new fetches below 300 GraphQL points or 300 REST requests left. Star history spends the REST quota (ADR-0020).

To create it, signed in as the machine account: Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.

- **Resource owner:** the machine account. **Repository access:** **Public repositories (read-only)**. No permissions beyond that.
- **Expiration:** the longest allowed. Note the expiry date.

It cannot see any private repository, so a public recap can never count private contributions the token's owner could see. Store it as a Production-only Vercel _Secret_ variable, like `TOKEN_ENCRYPTION_KEY`; it never reaches the browser and is never logged.

**Renewal:** set a reminder two weeks before the expiry date. As a backstop, from 14 days before expiry every public lookup logs `GITHUB_PUBLIC_TOKEN expires <date>: renew it` (read from GitHub's `github-authentication-token-expiration` header); search Vercel → Logs for it. Regenerate the token on the machine account (Fine-grained tokens → the token → Regenerate), replace `GITHUB_PUBLIC_TOKEN` in Vercel and redeploy. When it expires, recaps fetched in the last 12 hours keep playing (they are served without a GitHub call), every other public recap page shows an error, and signed-in users' own recaps are unaffected.

On Vercel, `DATABASE_URL` and the other `DATABASE_*` variables come from the Neon integration, connected to **Production only**; `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY` are Production-only too. Vercel builds production only ([ADR-0018](../architecture/decisions/0018-production-only-deploys.md)): there are no preview deployments and no Neon database branches. If previews are ever turned back on, give the Neon connection Preview **together with** "Create Database Branch For Deployment: Preview", or previews would get the production database and migrate it. The two secrets are Vercel _Secret_ variables, entered by the maintainer.

## GitHub App

One GitHub App, `wrapyourgit` (App ID 5604815), serves both local development and production: it lists both callback URLs, `http://localhost:3000/api/auth/callback/github` and `https://wrapyourgit.com/api/auth/callback/github`, and each environment uses its own client secret (GitHub allows several). It is **public**, which GitHub requires for anyone other than its owner to sign in. Settings, as in [development/setup.md](../development/setup.md#github-app-m2):

- **Homepage:** `https://wrapyourgit.com`
- **Expire user authorization tokens:** on. **Webhook:** off. **Repository permissions:** none; Metadata: read only if you use the optional install (ADR-0006, ADR-0008).
- A separate app per environment is still possible; it would need its own name (users see it on GitHub's consent screen).

## Database migrations

Migrations live in `apps/web/drizzle`. On Vercel the build command runs them first (`bun run db:migrate && bun run build`), so every deployment migrates before it builds. Only production deploys, so only the production database is migrated there. Elsewhere, apply them from any machine that can reach the database, before the new code goes live:

```bash
DATABASE_URL='<connection string>' bun run --filter @wyg/web db:migrate
```

Migrations only add; to roll back the code, keep the schema and deploy the previous version.

## Production now: Vercel + Neon

What is set up, and how to set it up again:

1. **Vercel project** `wrapyourgit` (team "mainan bheeboyy", Hobby), imported from `habibiahmada/wrapyourgit`:
   - Root Directory: `apps/web`, with "Include files outside the root directory" on (the app imports `packages/*`).
   - Install command: `cd ../.. && bun install --frozen-lockfile` (the whole workspace, from the repository root).
   - Build command: `bun run db:migrate && bun run build`. `build` first copies `art`, `audio`, `lang` and `photos` from `packages/video/public` into `apps/web/public` (`scripts/sync-web-public.ts`): symlinks there made Vercel's output step fail.
   - Settings → Functions → Function Region: Singapore (`sin1`), next to the database.
   - Every push to `main` deploys production. Other branches are skipped (Settings → Build and Deployment → Ignored Build Step: "Only build production", ADR-0018).
2. **Neon** through Vercel → Storage → Create Database → Neon: region Singapore, free plan, Neon Auth off, connected to the project with the variable prefix `DATABASE` (so the pooled string is `DATABASE_URL`).
3. **Environment variables** as in the table and scopes above.
4. **Rate limit:** Vercel → Firewall → Rules → "Rate limit /api, /u/ and recap pages": fixed window of 60 seconds, 60 requests per IP, then **429**, published to production, matching any of three Request Path conditions (OR):
   - starts with `/api`;
   - starts with `/u/` (these redirect to `/<username>`, but `/u/<reserved name>` serves a recap itself);
   - matches the expression `^/[A-Za-z0-9-]{1,39}(/opengraph-image)?$`: the recap pages `/<username>` and their preview images. Each one can start a GitHub fetch held open for up to `maxDuration` (120 s), so they need the same per-IP ceiling as the API.

   The expression only matches one or two path segments with no dot, so static assets (`/_next/…`, `/art/…`, `/robots.txt`, `/icon.svg`) are never limited. It also matches site pages such as `/settings` and `/privacy`, which is harmless at 60 a minute. This edge limit sits in front of the app's own one (20 new lookups per client per hour, `server/public-policy.ts`), which only counts requests that reach GitHub; if the plan's rule editor ever lacks expression matching, keep the first two conditions and rely on that in-app limit for `/<username>`. Firewall changes apply without a redeploy; after a change, use Review Changes → Publish.
5. **Domain:** Vercel → Domains → add `wrapyourgit.com` (connected to Production, with "redirect apex to www" unticked) and `www.wrapyourgit.com` (308 redirect to `wrapyourgit.com`); Vercel shows a project-specific CNAME target. In Cloudflare (zone `wrapyourgit.com`): `CNAME @ → <that target>` and `CNAME www → <that target>`, proxy **off** (DNS only), so Vercel terminates TLS and issues the certificate. The first domain, `wrapyourgit.habibiahmada.dev`, stays on the project as a 308 redirect to `wrapyourgit.com` ([ADR-0025](../architecture/decisions/0025-production-at-wrapyourgit-com.md)).

Verified on 2026-11-05: the site, the copied static folders (`/art`, `/photos`, `/lang`; `/sprites` was removed later, #63), `robots.txt`, `sitemap.xml`, the Open Graph image, HSTS (sent by Vercel), sign-in with the GitHub App, a full sync (about 20 seconds) into Neon, and the dashboard, with no console errors.

### Backups and monitoring

Not set up yet (M6). The checklist:

- **Database backups.**
  - Neon keeps a restore window for point-in-time recovery; how long depends on the plan. Check it under Neon → the project → Settings, and write it here.
  - For a copy outside Neon, run `pg_dump -Fc "<direct connection string>"` on a schedule, keeping about 14 days. `pg_dump` needs the direct (unpooled) string from Neon → Connect, not the pooled `DATABASE_URL`. Check whether the Vercel integration also added it as a variable.
  - Restore one dump into a scratch Neon branch before launch.
- **What to watch:**
  - **Vercel → Logs.** Search for:
    - `public recap failed` (a public fetch that errored; it carries no login);
    - `Auto-sync failed`;
    - `GITHUB_PUBLIC_TOKEN expires`.
  - **Vercel → Usage.** Function duration and invocations: a first public fetch takes about 20–55 s, so they dominate.
  - **Neon → Monitoring.** Compute hours and storage against the free plan's limits.
  - **Vercel → Analytics.** Page views, top pages, referrers, countries and devices from Vercel Web Analytics (`components/site/page-analytics.tsx`, which strips query strings first). Enable it once under the project's Analytics tab; the privacy page describes what it collects.
- **Quota.** `bun --env-file=apps/web/.env.local` with a short script against `https://api.github.com/rate_limit` shows the public token's GraphQL and REST quota left. That call costs nothing.

## Later: production on an AWS VPS

A single Linux VPS (Ubuntu 24.04 assumed) runs the web app and Postgres.

### 1. Server

```bash
# Node 22 (Next.js runs on Node) and Bun (workspace scripts)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs
curl -fsSL https://bun.sh/install | bash
# Docker for Postgres, Caddy for HTTPS
sudo apt-get install -y docker.io caddy
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

Put the variables in `/etc/wrapyourgit.env` (owner root, mode `600`). Then migrate and build:

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
wrapyourgit.com {
  encode zstd gzip
  # The app sends no HSTS header itself; Caddy adds it.
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
  reverse_proxy 127.0.0.1:3000
}
```

Point the domain's `A` record at the VPS, then `sudo systemctl reload caddy`; Caddy gets the certificate itself.

**Not yet verified:**

- `curl -I https://wrapyourgit.com` returns 200 with `Strict-Transport-Security`.

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

## Before launch

From ADR-0005:

- [ ] Database backup restored once on a scratch database.
- [ ] Repository public and `bun scripts/github-settings.ts` run, so `main` is protected (ADR-0014).
- [ ] Every **Not yet verified** item above confirmed and removed from this guide.
- [ ] `GITHUB_PUBLIC_TOKEN` set in Production, and a renewal reminder set before its expiry date.
- [ ] Backups and monitoring set up as in [Backups and monitoring](#backups-and-monitoring), and Neon's restore window written down.
