# 0025. Production lives at wrapyourgit.com

- Status: Accepted
- Date: 2026-11-13
- Amends: [0015](0015-production-on-vercel-first.md) point 1 (the production domain)

## Context

Production ran at `wrapyourgit.habibiahmada.dev`, a subdomain of the maintainer's own site. The maintainer bought `wrapyourgit.com` (on Cloudflare) and asked for it to be the address everywhere, with the old one redirecting there, and for search to find the site for "GitHub wrapped" and similar queries (#98).

## Decision

1. **`https://wrapyourgit.com` is the canonical origin.** The Vercel project serves it (Production); `www.wrapyourgit.com` and `wrapyourgit.habibiahmada.dev` stay on the project as 308 redirects to it. Cloudflare holds `CNAME @` and `CNAME www` to Vercel's project target, DNS only, so Vercel issues the certificates.
2. **`APP_URL` is `https://wrapyourgit.com`.** It drives the OAuth callback, canonical URLs, the sitemap and secure cookies. The GitHub App lists the callbacks for localhost, `wrapyourgit.com` and, during the move, the old domain; its homepage is `wrapyourgit.com`.
3. **Every living file names the new origin:** `site.ts`, the story's footer, `llms.txt` and `llms-full.txt`, the README, SECURITY.md, the deployment guide, CI and `.env.example`. Records of the past (this ADR's predecessors, the CHANGELOG's earlier entries, old plans) keep the old name.

## Consequences

- Old links keep working through the redirect; sign-in only ever completes on `wrapyourgit.com`.
- The old callback can be removed from the GitHub App once the old domain only redirects.
- Search Console (or Bing Webmaster Tools) for `wrapyourgit.com` can be verified with a DNS TXT record in Cloudflare; that is the maintainer's to add.
