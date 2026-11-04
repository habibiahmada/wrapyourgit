# Contributing to WrapYourGit

Thanks for wanting to help. WrapYourGit turns a developer's GitHub year into an animated story, and its one promise is that **every number on screen is correct and explainable**. Most of the rules below exist to keep that promise.

## Ways to help

- **Report a wrong number.** If your recap disagrees with GitHub, open a [bug report](https://github.com/habibiahmada/wrapyourgit/issues/new?template=bug_report.yml) with the metric, what you expected and where you saw it. Never paste tokens or private repository names.
- **Suggest a metric or a scene.** Use a [feature request](https://github.com/habibiahmada/wrapyourgit/issues/new?template=feature_request.yml). Say which GitHub data it would come from: a metric without a source cannot ship.
- **Fix or build something.** Pick an open issue, say you're on it, then open a pull request.
- **Security issues** go through [SECURITY.md](SECURITY.md), never a public issue.

## Development setup

Requirements: [Bun](https://bun.sh) 1.4+, Node 22+, Git, and Docker or Podman for the local database.

```bash
git clone https://github.com/habibiahmada/wrapyourgit.git
cd wrapyourgit
bun install
cp .env.example apps/web/.env.local     # then fill it in
bun scripts/dev-db.ts                   # Postgres on localhost:54329
bun run --filter @wyg/web db:migrate
bun run dev                             # http://localhost:3000
```

The full guide, including creating your own GitHub App for sign-in, is in [docs/development/setup.md](docs/development/setup.md). To look at the video without signing in, run `bun run studio`.

## Before you open a pull request

```bash
bun run typecheck && bun test && bun run lint
```

CI runs the same commands plus `bun install --frozen-lockfile`, `biome ci` and a production build. A pull request is mergeable once CI is green.

## Rules that are easy to break

These come from [AGENTS.md](AGENTS.md), which is the short version of how the codebase works:

1. **Schema first.** A new metric goes into `packages/schema/src/recap.ts`, gets a definition in [docs/analytics/metrics.md](docs/analytics/metrics.md), is computed in `packages/analytics` with a test, and only then is rendered.
2. **Unavailable is not zero.** Use the `metric()` wrapper for anything GitHub might not provide, and mark values from partial data `estimated`.
3. **Scenes are deterministic.** In `packages/video`, animate only from `useCurrentFrame()`, `interpolate`, `spring` and seeded `random()`.
4. **Private data never goes public.** Anything shareable goes through `toPublicRecap()`.
5. **Tokens stay on the server.**

## Workflow

1. Open or pick an issue that describes the problem and what "done" looks like.
2. Branch from `main`: `<type>/<issue>-<slug>`, for example `feat/42-weekday-scene`.
3. Commit small, one logical change per commit, using [Conventional Commits](https://www.conventionalcommits.org): `feat(video): …`, `fix(analytics): …`, `docs: …`, `chore: …`.
4. Open a pull request with what changed, how you tested it, and `Closes #<issue>`.
5. Update the docs in the same area as your change (metrics, ADRs, DESIGN.md).

Architecture decisions are recorded as ADRs in [docs/architecture/decisions](docs/architecture/decisions). Changing a decision means writing a new ADR that supersedes the old one.

## Code style

TypeScript strict with `noUncheckedIndexedAccess`; Biome formats and lints (`bun run format` fixes most things). Comments explain _why_, not _what_. Tests live next to the code (`foo.ts` → `foo.test.ts`).

## Working with AI coding agents

Agents are welcome. Point them at [AGENTS.md](AGENTS.md) first. You are responsible for every line you submit: read it, run it, and make sure the commit and pull request are in your name.

## Code of conduct

Everyone taking part agrees to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
