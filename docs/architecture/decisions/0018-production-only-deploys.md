# 0018. Vercel deploys production only; no preview deployments or database branches

- Status: Accepted
- Date: 2026-11-10
- Amends: [0015](0015-production-on-vercel-first.md) (decisions 1 and 2, the preview parts)

## Context

ADR-0015 let Vercel build a preview deployment for every branch, and the Neon integration gave each preview a database branch of its own (`preview/<git branch>`). Every pull request then cost a Vercel build and a Neon branch. Neon's free plan allows 10 branches and the integration never deletes them, so the limit filled up after about nine pull requests and new previews failed before building (2026-11-10). Previews can't sign anyone in, so they never showed much beyond what the CI build already proves.

## Decision

1. **Vercel builds production only.** The project's Ignored Build Step is "Only build production" (`if [ "$VERCEL_ENV" == "production" ]; then exit 1; else exit 0; fi`). Pushes to other branches are skipped before they build, and the "Vercel" check on a pull request shows as skipped. GitHub CI's "Build web" job still builds every pull request.
2. **The database is connected to Production only.** In the Neon integration's connection to the `wrapyourgit` project, Environments is "Production" and "Create Database Branch For Deployment" is off for both Preview and Production. The `DATABASE_*` variables exist for Production only, so nothing outside production can reach a database.
3. **Migrations still run in the production build** (`bun run db:migrate && bun run build`), as ADR-0015 decided.

## Consequences

- No Vercel build minutes or Neon branches are spent on pull requests.
- A pull request can no longer be clicked through on a Vercel URL before merging; check it locally (`bun run dev`) instead.
- If previews are ever turned back on, the Neon connection must get Preview back together with "Create Database Branch For Deployment: Preview". Adding Preview to Environments without a branch per deployment would hand previews the production database, and their builds would run `db:migrate` on it.

## Alternatives considered

- **Previews without a database:** the connection limited to Production, with the build command migrating only when `VERCEL_ENV` is production. Previews would still build, but every page that needs the database fails there, and each pull request still costs a Vercel build.
- **Keep branches and clean them up:** the integration offers no automatic cleanup in this setup, so it means deleting branches by hand after every few pull requests.
