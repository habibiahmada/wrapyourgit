# 0034. An allowlist Content-Security-Policy, not nonces

- Status: Accepted
- Date: 2026-11-17

## Context

Until now the site sent only `frame-ancestors 'none'`. Nothing limited where scripts, frames, connections or form posts could go, so an injected `<script src>` from any origin, an `<object>` or a `<base>` tag would run. A security audit on 2026-11-17 listed this as hardening: no injection sink exists in the source today, but the policy is the layer that holds when one appears.

The strict form is a nonce per request with `'strict-dynamic'`. Next 16 can only put a nonce on pages rendered per request, and its CSP guide says nonces are incompatible with Partial Prerendering. The site runs `cacheComponents`, so nonces would mean turning that off and rendering every page per request.

## Decision

1. **An allowlist, built in one place** (`apps/web/src/csp.ts`, sent by `next.config.ts` with every response):
   - `default-src 'self'`.
   - `script-src 'self' 'unsafe-inline'` plus Turnstile (`challenges.cloudflare.com`) and the Cloudflare beacon (`static.cloudflareinsights.com`). Inline stays allowed because Next's own hydration scripts are inline and carry no nonce.
   - `connect-src 'self'` plus the beacon's endpoint and `fonts.gstatic.com` (the story's typeface is fetched).
   - `font-src` adds `fonts.gstatic.com`; `img-src` adds `data:`, `blob:` and GitHub avatars; `media-src` and `worker-src` add `blob:` for the exports.
   - `frame-src` only Turnstile; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`.
   - Production adds `upgrade-insecure-requests`; development adds `'unsafe-eval'`, which React needs there only.
2. **Remotion's usage ping stays blocked.** `@remotion/web-renderer` posts each render to `www.remotion.pro/api/track/register-usage-point`, with the site's host, even with `licenseKey: "free-license"`. The privacy page names no such third party, the render does not depend on the ping (it fails quietly), and the free licence (ADR-0016) asks for no reporting. So its origin is not in `connect-src`.

## Alternatives considered

- **Nonces with `'strict-dynamic'`.** It also stops injected inline scripts, at the price of `cacheComponents`, every page rendered per request and higher hosting cost.
- **Next's experimental SRI.** It hashes the bundles at build time, but it is experimental and does not cover the inline hydration scripts.
- **Report-Only first.** It would not have broken anything, but every listed origin was checked locally against the real pages, so it would only have delayed the protection.

## Consequences

- A script, frame, connection or form target from any unlisted origin is refused by the browser. Adding a third-party service now means adding its origin in `csp.ts` and its test.
- An injected inline script would still run. If the site ever leaves `cacheComponents`, revisit nonces.
- Visitors' renders no longer reach remotion.pro. If the project ever needs a Remotion Company License, its usage reporting has to be allowed here first.
