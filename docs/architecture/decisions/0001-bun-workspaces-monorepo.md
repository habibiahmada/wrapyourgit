# 0001. Bun workspaces monorepo, packages ship TS source

- Status: Accepted
- Date: 2026-11-04

## Context

Web app, video compositions, Lambda renderer and analytics share types and components. One maintainer, moving fast. Maintainer prefers Bun.

## Decision

- One repo, Bun workspaces: `apps/*`, `packages/*`, `scripts`.
- Internal packages (`@wyg/*`) export TypeScript source directly (`"exports": {".": "./src/index.ts"}`), no build step. Next.js compiles them via `transpilePackages`; Remotion's bundler and Bun handle TS natively.
- No Turborepo for now; root scripts use `bun run --filter`.
- Biome for lint + format, `bun test` for unit tests.

## Consequences

- Zero build orchestration; editing a package is instantly visible everywhere.
- Every new package imported by web must be added to `transpilePackages`.
- If build times grow, add Turborepo later without changing package layout.

## Alternatives

pnpm + Turborepo (more ceremony than needed today); separate repos (type drift between web and video).
