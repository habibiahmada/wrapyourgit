# AGENTS.md

Context for AI coding agents (and humans who like short docs). Read this first, then the doc linked for the area you touch.

## What this is

**WrapYourGit** turns a developer's GitHub activity for one year into an animated, shareable recap: an interactive story on the web plus MP4 export in four aspect ratios with a soundtrack. Edition: **2026**. Product spec: [docs/product/prd.md](docs/product/prd.md).

Core promise: _every number on screen is correct and explainable._ Visual polish never justifies a wrong or unlabelled number.

## Repository map

```
apps/web          Next.js 16 (App Router). Landing, GitHub auth, dashboard, live story via @remotion/player.
apps/renderer     Remotion Lambda (AWS) deploy script + startRender/getRenderStatus used by web.
packages/schema   RecapData zod schema + video formats. THE contract between all modules.
packages/github   GitHub GraphQL client and queries. Raw API shapes live here, nowhere else.
packages/analytics Pure functions: raw GitHub data -> RecapData. No I/O. Unit-tested.
packages/video    Remotion compositions & scenes. Shared by web Player and MP4 export.
scripts/          One-off spikes and maintenance scripts (bun).
docs/             Product, architecture (ADRs), metric definitions, video system, dev setup.
```

Data flow: `github` (fetch) → `analytics` (compute) → `RecapData` (validated by `schema`) → `video` (render on web or Lambda).

## Commands (run from repo root, package manager is **bun**)

| Task                   | Command                                                     |
| ---------------------- | ----------------------------------------------------------- |
| Install                | `bun install`                                               |
| Web dev server         | `bun run dev` (http://localhost:3000)                       |
| Remotion Studio        | `bun run studio`                                            |
| Unit tests             | `bun test`                                                  |
| Typecheck all          | `bun run typecheck`                                         |
| Lint + format check    | `bun run lint` (fix: `bun run format`)                      |
| GitHub data spike      | `GITHUB_TOKEN=$(gh auth token) bun scripts/spike-github.ts` |
| Deploy Lambda renderer | `bun run --filter @wyg/renderer deploy` (needs AWS env)     |

Before declaring work done: `bun run typecheck && bun test && bun run lint`.

## Rules that are easy to break

1. **Schema first.** Any new metric: add it to `packages/schema/src/recap.ts`, define it in [docs/analytics/metrics.md](docs/analytics/metrics.md), compute it in `packages/analytics` with a test. Then render it.
2. **Unavailable ≠ 0.** Use the `metric()` wrapper for anything GitHub may not give us. Mark derived-from-partial-data values `estimated: true` and label them in the UI.
3. **Scenes are deterministic.** In `packages/video`, animate only from `useCurrentFrame()` / `interpolate` / `spring`. No Framer Motion, CSS transitions, `Date.now()`, `Math.random()` (use `random(seed)` from remotion), or chart-library animations inside scenes. Framer Motion is fine in `apps/web` UI _outside_ the story.
4. **Branch on layout family, not ratio.** Scenes use `useLayout()` → `portrait | compact | landscape`. Size things relative to `width`/`height` from `useVideoConfig()`, never fixed px.
5. **Tokens stay on the server.** GitHub tokens are encrypted at rest and never sent to the browser. GitHub calls happen in server code only.
6. **Private data never goes public.** Private repo names/details are redacted before building any public recap page, PNG or video that will be shared.
7. **Workspace packages ship TS source** (no build step). If `apps/web` imports a new `@wyg/*` package, add it to `transpilePackages` in `apps/web/next.config.ts`.
8. **Next.js 16 differs from your training data.** See `apps/web/AGENTS.md`; read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.

## Git workflow (enforced)

Issue → branch `<type>/<issue>-<slug>` (`gh issue develop N --name ... --base main --checkout`) → small Conventional Commits → PR with a Conventional title and `Closes #N` → self-review comment → merge commit after green CI and the maintainer's OK (`gh pr merge N --merge --delete-branch`). Never commit or push to `main`. Commits, PRs and issues are in English, in the author's own name; crediting an AI tool is allowed but recommended against. `.githooks` (installed by `bun install`) and the CI `Policy` job check this with `scripts/policy/rules.ts`. Full version: CONTRIBUTING.md "Workflow" and "Releases".

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`. Biome for lint/format (double quotes, 2 spaces, width 100).
- Tests sit next to code: `foo.ts` → `foo.test.ts`, run with `bun test`.
- Comments explain _why_ or a non-obvious contract, not what the code does.
- Architecture decisions go in `docs/architecture/decisions/NNNN-title.md` (ADR). If you change a decision, write a new ADR that supersedes the old one.
- Docs are in English; discussion with the maintainer may be in Bahasa Indonesia.

## Where to read next

| You are working on               | Read                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------- |
| Anything                         | [docs/README.md](docs/README.md)                                                  |
| GitHub fetching / metrics        | [docs/analytics/metrics.md](docs/analytics/metrics.md)                            |
| Scenes, animation, audio, export | [DESIGN.md](DESIGN.md) + [docs/video/scene-system.md](docs/video/scene-system.md) |
| Infra, auth, deploy              | [docs/architecture/overview.md](docs/architecture/overview.md) + ADRs             |
| What to build next               | [docs/product/roadmap.md](docs/product/roadmap.md)                                |
