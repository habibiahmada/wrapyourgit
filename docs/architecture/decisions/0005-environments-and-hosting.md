# 0005. Vercel + Neon for dev/staging, AWS for production

- Status: Accepted, cost review pending; production hosting amended by [0015](0015-production-on-vercel-first.md) (Vercel first)
- Date: 2026-11-04

## Context

Maintainer has an AWS VPS and >$100 AWS credits that expire 2026-12-31, and wants free platforms for development/staging.

## Decision

| Env         | Web                                                           | Database                                             | Rendering       | Storage |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------- | --------------- | ------- |
| dev/staging | Vercel Hobby (personal, non-commercial)                       | Neon free tier                                       | Remotion Lambda | S3      |
| production  | AWS VPS (Docker, Next.js `output: "standalone"`) behind HTTPS | Postgres on AWS (VPS container first, RDS if needed) | Remotion Lambda | S3      |

Railway is a fallback for staging if Vercel limits get in the way.

## Risk: credits expire right before peak season

Users will want their **final** 2026 recap in early January, exactly when credits are gone. Before launch:

1. Set an AWS Budget alert (e.g. $20/month after Jan 1).
2. Measure cost per render (ADR-0004) and set per-user daily render limits accordingly.
3. Decide a fallback if spend grows: cache identical renders, lower default resolution, queue renders, or ask for sponsorship.

## Consequences

Two deployment targets to keep working. The steps are in [docs/deployment/guide.md](../../deployment/guide.md) (a systemd service on the VPS for now; a Dockerfile is still open for M7).
