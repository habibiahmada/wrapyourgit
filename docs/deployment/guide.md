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

| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | no | Cloudflare Turnstile keys for the check before a new public fetch (ADR-0026). Both or neither: with either missing the check is off. See [The human check](#the-human-check). |

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
4. **Rate limit:** Vercel → Firewall → Rules → "Rate limit /api and /u/ endpoints": fixed window of 60 seconds, 60 requests per IP, then **429**, published to production, matching either of two Request Path conditions (OR):
   - starts with `/api`;
   - starts with `/u/` (these redirect to `/<username>`, but `/u/<reserved name>` serves a recap itself).

   The recap pages `/<username>` are **not** in this rule, and on the Hobby plan they cannot be added: see [Firewall, DNS and headers](#firewall-dns-and-headers), which also has the other rules, Cloudflare's part and the headers. **Do not delete or disable this rule:** the plan would not let it be made again. This edge limit sits in front of the app's own one (20 new lookups per client per hour, `server/public-policy.ts`), which only counts requests that reach GitHub.
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

### Firewall, DNS and headers

Three layers, and only one of them sees a request: **Vercel's firewall**. Cloudflare answers DNS and nothing else, and the app sends a few headers of its own.

> **Status (2026-11-13):** the headers ship with the app; the human check, the probe rule and Bot Protection (both in log mode), the four mail records and DNSSEC were all applied that day. The rate limit covers `/api` and `/u/` only, and on this plan it stays that way (rule 1 below). Still to do: move the probe rule from log to deny after reading a day of matches, the optional CAA record, and the account checks.

#### Why Cloudflare stays DNS-only

Cloudflare's firewall only acts on proxied (orange cloud) records. Turning the proxy on would put it in front of Vercel, and here that costs more than it gives:

- Vercel would see Cloudflare's addresses instead of the visitor's. The edge rate limit (60 a minute **per IP**) and the app's own limit (20 new lookups per client an hour, `clientKey()` in `server/public-recaps.ts`, which reads the first `x-forwarded-for` address) would then count many visitors as one and lock real people out.
- Vercel's Bot Protection does not work behind a reverse proxy, and its DDoS mitigation may block a shared Cloudflare address that carries real visitors too.
- Two caches: a deploy on Vercel would not clear Cloudflare's, so old HTML could point at assets that are gone.

Vercel's own guidance is the same: connect directly where possible, and use Cloudflare in DNS-only mode. If the proxy is ever wanted, that is a decision of its own (Full (strict) TLS, the rate limit moved to Cloudflare, and `clientKey()` taught to trust `CF-Connecting-IP`), not a switch to flip.

#### Vercel Firewall

Hobby allows **three custom rules**, one of which may be a rate limit, plus ten IP blocks. Changes apply without a redeploy and can be rolled back from Firewall → ⋯ → View Audit Log.

From a terminal, once: `npx vercel@latest login`, then `cd apps/web && npx vercel@latest link` (`.vercel/` is gitignored). Rule changes are staged as a draft; `npx vercel@latest firewall diff` shows the draft and `npx vercel@latest firewall publish` puts it live. `npx vercel@latest firewall status` lists what is live, in the order it runs.

- **Rule 1, the rate limit, as it is** (item 4 above): `/api` and `/u/`, 60 requests a minute per IP. It was meant to cover the recap pages too, and never did: on 2026-11-13, 75 requests to `/privacy` (which has a recap page's shape) all passed, while `/api/card` answered 429 after 60. Adding the condition was then refused when saving the rule, with **"Rate limiting is not available for this plan (402)"**. The rule that exists keeps running, but Hobby no longer lets a rate limit be changed, so:
  - **Leave the rule alone.** Deleted or disabled, it could not be made again without Pro.
  - **What covers the recap pages instead:** [the human check](#the-human-check) (a request with no person behind it starts no GitHub fetch), the app's own limit (20 new lookups per client an hour), the 12-hour store, and Vercel's own DDoS mitigation, which needs no rule. What none of them does is cap one address hammering a recap that is already stored; each of those requests is a database read and a render, not a GitHub call.
  - **On Pro**, the full rule is the one below, and the check after it should show 60 answers and 15 times 429 (`/privacy` starts no GitHub fetch):

  ```bash
  npx vercel@latest firewall rules update "Rate limit /api and /u/ endpoints" \
    --condition '{"type":"path","op":"pre","value":"/api"}' --or \
    --condition '{"type":"path","op":"pre","value":"/u/"}' --or \
    --condition '{"type":"path","op":"re","value":"^/[A-Za-z0-9-]{1,39}(/opengraph-image)?$"}' --yes
  npx vercel@latest firewall publish
  seq 1 75 | xargs -P 15 -I{} curl -s -o /dev/null -w "%{http_code}\n" https://wrapyourgit.com/privacy | sort | uniq -c
  ```

- [x] **Rule 2, deny probes** (live in **log** mode since 2026-11-13, as "Deny probes"). Scanners ask every site for `/.env`, `/wp-login.php`, `/.git/config` and the like. Here each of those would wake the `/<username>` function, since any single segment is a possible username. None of them can be a page of this app: a GitHub username has no dot, nothing the app serves starts with a dot except `/.well-known/`, and the app only handles `GET`, `HEAD` and `POST`.

  ```bash
  npx vercel@latest firewall rules add "Deny probes" \
    --description "Dotfiles, script and backup extensions, and methods the app never handles" \
    --condition '{"type":"path","op":"re","value":"/\\.[^/]"}' \
    --condition '{"type":"path","op":"pre","value":"/.well-known/","neg":true}' \
    --or \
    --condition '{"type":"path","op":"re","value":"\\.(php[0-9]?|phtml|asp|aspx|jsp|cgi|sql|bak|old|ini|pem)$"}' \
    --or \
    --condition '{"type":"method","op":"inc","value":["PUT","PATCH","DELETE","TRACE","CONNECT"]}' \
    --action log --yes
  npx vercel@latest firewall rules move "Deny probes" --first --yes
  npx vercel@latest firewall publish
  ```

  It starts as **log**. After a day, read what it matched (`npx vercel@latest firewall traffic list --dimension path --dimension rule`). If every path is a probe, make it deny:

  ```bash
  npx vercel@latest firewall rules update "Deny probes" --action deny --yes
  npx vercel@latest firewall publish
  ```

  `/.well-known/` stays open on purpose: Vercel renews the certificate through it.

- [ ] **Rule 3 is kept free**, for the day something is wrong. An attack on the recap pages can be met at once with a challenge on them, which real browsers pass:

  ```bash
  npx vercel@latest firewall rules add "Challenge recap pages" \
    --condition '{"type":"path","op":"re","value":"^/[A-Za-z0-9-]{1,39}$"}' \
    --action challenge --yes
  npx vercel@latest firewall publish
  ```

  Remove it when the attack is over (`rules remove "Challenge recap pages" --yes`, then `publish`): while it is on, link previews from services Vercel does not list as verified bots get the challenge instead of the card. For an attack on the whole site, Attack Mode challenges every visitor and still lets verified bots through; it applies at once, with no publish: `npx vercel@latest firewall attack-mode enable --duration 1h --yes`.

- [x] **Bot Protection: log, not challenge** (set 2026-11-13). `npx vercel@latest firewall rules update bot-protection --action log --yes`, then `publish`. A recap is made to be shared, and a shared link is fetched by a bot. Vercel lets its verified bots through (X, Facebook, LinkedIn, Google and others are on its list), but on 2026-11-13 that list had no entry for Slack, Discord, WhatsApp or Telegram, so **challenge** would risk blank cards exactly where developers paste links. Log shows who comes without stopping anyone. Read it for a while before deciding more.
- [x] **AI Bots: allow.** The site publishes `llms.txt` and wants to be found. Nothing to change; this is here so it is a decision and not an oversight.

What these rules do not stop: a probe for a name that _could_ be a username (`/admin`, `/login`, `/wp-admin`). It reaches the app. With [the human check](#the-human-check) on it starts nothing, since a scanner holds no pass; without it, it may start one public fetch, bounded by the 12-hour cache and the 20 new lookups an hour per client.

#### The human check

The edge rules count requests per address. They cannot tell a person from a script, and a script with many addresses can still drain the one GitHub token every visitor shares. So before the server reads a recap nobody has fetched lately, a visitor who is not signed in passes Cloudflare Turnstile once an hour ([ADR-0026](../architecture/decisions/0026-a-human-check-before-a-new-public-fetch.md)). Stored recaps, and their link previews, are never checked. Turnstile is a widget on the page, so it works with the proxy off.

- [x] **Create the widget.** Cloudflare dashboard → Application security → Turnstile → Add widget: any name, hostname `wrapyourgit.com`, mode **Managed**. Copy the site key and the secret key.
- [x] **Set both in Vercel** → Settings → Environment Variables, Production: `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (the secret marked Sensitive), then redeploy. With either missing the check is off and the site behaves as before, which is also how to switch it off in a hurry.
- [x] **Check it** in a private window: open `/<a username nobody has opened today>`. The page "One quick check before @…'s recap" appears, passes, and the recap loads. Open it again: no check. Then `curl -s https://wrapyourgit.com/<another new name> | grep -c "One quick check"` prints 1, and nothing in Vercel's logs shows a GitHub fetch for it.

Done on 2026-11-13: the widget is `wrapyourgit` (Managed, one hostname). From outside, a made-up name with no session got the check page with the real site key; `/api/verify` answered 403 to a made-up token, to Cloudflare's dummy token and to a request with no `Origin`; a forged pass was asked to check again; the preview image of a new name was the site's card; and `/habibiahmada`, which is stored, played with no check. The maintainer passed the widget in a private window.

Locally, Cloudflare's published test keys go in `apps/web/.env.local`: site `1x00000000000000000000AA` with secret `1x0000000000000000000000000000000AA` always passes, `2x00000000000000000000AB` with `2x0000000000000000000000000000000AA` always fails, and site `3x00000000000000000000FF` shows the tick box.

#### Cloudflare (zone `wrapyourgit.com`)

With the proxy off, what Cloudflare can protect is the domain itself.

- [x] **Nobody can send mail as `@wrapyourgit.com`** (the four records below added 2026-11-13, read back from Cloudflare's nameservers). The domain sends and receives no mail, and today nothing says so, so anyone can forge it. DNS → Records → Add record:

  | Type  | Name           | Content                                           |
  | ----- | -------------- | ------------------------------------------------- |
  | `TXT` | `@`            | `v=spf1 -all`                                     |
  | `TXT` | `_dmarc`       | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s`  |
  | `TXT` | `*._domainkey` | `v=DKIM1; p=`                                     |
  | `MX`  | `@`            | `.` with priority `0` (a "null MX": no mail here) |

  If the domain ever gets a mailbox, these four are replaced by the provider's own records first.

- [x] **DNSSEC** (on since 2026-11-13: key tag 2371, algorithm 13, digest type 2, DS entered at Hostinger → DNS / Nameservers → DNSSEC), so a resolver can tell a forged answer for the domain from a real one. Cloudflare → DNS → Settings → Enable DNSSEC shows a DS record. The registrar is Hostinger, not Cloudflare, so that DS record has to be entered there by hand (Hostinger → the domain → DNS / Nameservers → DNSSEC; algorithm 13, also called ECDSA P-256 with SHA-256). Do both steps in one sitting. To turn it off again, remove the DS record at Hostinger first and wait a day before disabling it in Cloudflare; the other order takes the domain offline for validating resolvers.
- [ ] **CAA (optional)**, so only Vercel's certificate authority may issue for the domain: `CAA @ 0 issue "letsencrypt.org"`. Vercel's documentation names Let's Encrypt, and that is who issued the current certificate. Skip this if in doubt: a CAA record that leaves Vercel's authority out stops renewal, and no CAA record at all is allowed.
- [ ] **Accounts.** Two-factor sign-in on Cloudflare, Vercel, Hostinger and GitHub; any Cloudflare API token scoped to this zone's DNS only; the registrar's transfer lock left on (it is: `clientTransferProhibited`).

#### Headers the app sends

Set in `apps/web/next.config.ts` for every response; `Strict-Transport-Security` is Vercel's.

| Header                    | Value                                                          | Why                                                                                    |
| ------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `X-Content-Type-Options`  | `nosniff`                                                      | A response is never read as another type than it says.                                 |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                              | A link out names the site, not the page: a recap's address has a username in it.       |
| `X-Frame-Options`         | `DENY`                                                         | No page is drawn inside another site's frame (clickjacking), for older browsers.       |
| `Content-Security-Policy` | `frame-ancestors 'none'`                                       | The same, for current browsers. Only this directive: a full policy is not written yet. |
| `Permissions-Policy`      | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | The site asks for none of them, so nothing loaded into it may.                         |

A full `Content-Security-Policy` (scripts, images, workers) is not set: the story's renderer and the exports use inline scripts, blobs and workers, and a policy that breaks a download is worse than none. It belongs in `Content-Security-Policy-Report-Only` first.

#### Check it

```bash
curl -sI https://wrapyourgit.com/ | grep -i -E "x-content-type|referrer-policy|x-frame|content-security|permissions-policy|strict-transport"
curl -s -o /dev/null -w "%{http_code}\n" https://wrapyourgit.com/.env        # 403 once rule 2 denies
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE https://wrapyourgit.com/  # 403 once rule 2 denies
dig +short TXT wrapyourgit.com; dig +short TXT _dmarc.wrapyourgit.com; dig +short MX wrapyourgit.com
dig +short DS wrapyourgit.com                                                # not empty once DNSSEC is on
```

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
