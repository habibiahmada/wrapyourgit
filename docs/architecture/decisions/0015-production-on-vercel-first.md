# 0015. Production runs on Vercel first; the AWS VPS comes later

- Status: Accepted
- Date: 2026-11-05
- Amends: [0005](0005-environments-and-hosting.md) (production hosting, for now)

## Context

ADR-0005 put staging on Vercel + Neon and production on an AWS VPS. The maintainer asked to deploy now, with Remotion and AWS left for later because of a problem signing in to AWS. The domain `habibiahmada.dev` is on Cloudflare DNS, and the maintainer's other projects already run on the same Vercel account.

## Decision

1. **Production is the Vercel project `wrapyourgit`** (Hobby), serving `wrapyourgit.habibiahmada.dev` through a Cloudflare `CNAME` (DNS only), with functions in Singapore (`sin1`) next to a Neon database in Singapore created through the Vercel integration. There is no separate staging for now; preview deployments build every branch.
2. **Migrations run in the build** (`bun run db:migrate && bun run build`), so a deployment can't ship code ahead of its schema. Preview builds get a Neon branch of their own and migrate that.
3. **One GitHub App for development and production** (`wrapyourgit`, public), with both callback URLs and a client secret per environment, so users see the name "WrapYourGit" on GitHub's consent screen. Secrets are Production-only Vercel variables entered by the maintainer.
4. **The public folders are copied, not symlinked** (`scripts/sync-web-public.ts`): Vercel's output step can't copy symlinked folders.

## Alternatives

- **Wait for the AWS VPS:** keeps ADR-0005 as written, but nothing ships until the AWS account works.
- **Staging on Vercel, no production yet:** the domain would stay empty, and the result would be the same setup under another name.
- **A separate GitHub App for production:** full isolation, but the name "WrapYourGit" was already taken by the development app.

## Consequences

- Slide exports answer 503 on Vercel (ADR-0011) until they move to `renderStillOnLambda` or production moves to the VPS.
- Vercel Hobby is for personal, non-commercial use, and its limits (function time, image transformations, bandwidth) now apply to production; watch Usage in Vercel before launch traffic.
- Preview deployments can't sign anyone in. They migrate their own Neon branch (enabled on 2026-11-05), not the production database; keep migrations additive anyway.
- Moving to the AWS VPS later follows [the deployment guide](../../deployment/guide.md#later-production-on-an-aws-vps); the GitHub App and Cloudflare record change, the code does not.
