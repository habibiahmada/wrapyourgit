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

CI runs the same commands plus `bun install --frozen-lockfile`, `biome ci`, a production build and the `Policy` check (see [Workflow](#workflow)). A pull request is mergeable once all of it is green.

## Rules that are easy to break

These come from [AGENTS.md](AGENTS.md), which is the short version of how the codebase works:

1. **Schema first.** A new metric goes into `packages/schema/src/recap.ts`, gets a definition in [docs/analytics/metrics.md](docs/analytics/metrics.md), is computed in `packages/analytics` with a test, and only then is rendered.
2. **Unavailable is not zero.** Use the `metric()` wrapper for anything GitHub might not provide, and mark values from partial data `estimated`.
3. **Scenes are deterministic.** In `packages/video`, animate only from `useCurrentFrame()`, `interpolate`, `spring` and seeded `random()`.
4. **Private data never goes public.** Anything shareable goes through `toPublicRecap()`.
5. **Tokens stay on the server.**

## Workflow

Every change, however small, goes through an issue, a branch and a pull request. Nothing is committed or pushed to `main` directly. The rules are checked by git hooks on your machine and by the `Policy` job in CI ([ADR-0014](docs/architecture/decisions/0014-contribution-workflow-enforcement.md)).

1. **Issue.** Open or pick one that states the problem and what "done" looks like (a checklist). Assign yourself and use the existing labels (`bug`, `enhancement`, `documentation`, ...); new labels need the maintainer's OK. A trivial change (a typo, one line of docs) may skip the issue.
2. **Branch** from `main`, named `<type>/<issue>-<slug>`, ideally straight from the issue:

   ```bash
   gh issue develop 42 --name feat/42-weekday-scene --base main --checkout
   ```

   Types follow Conventional Commits: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `ci`, `build`, `revert`, `style`. A trivial change without an issue uses `docs/<slug>` or `chore/<slug>`.
3. **Commits** are small, one logical change each, with a [Conventional Commit](https://www.conventionalcommits.org) subject of at most 100 characters: `feat(video): add the weekday scene`, `fix(analytics): count UTC days`. The body says _why_.
4. **Pull request** with a Conventional Commit title, what changed, how to test it, and `Closes #<issue>` for the issue in the branch name. Update the docs in the same area (metrics, ADRs, DESIGN.md, CHANGELOG.md).
5. **Review.** The author leaves a review comment on their own pull request with what they tested and anything worth knowing. Pull requests from others are approved or sent back by the maintainer.
6. **Merge** once CI is green (`Policy`, `Lint, typecheck, test`, `Build web`) and the maintainer agrees, with a **merge commit** (squash and rebase are turned off) and the branch deleted:

   ```bash
   gh pr merge <number> --merge --delete-branch
   ```

Commits, pull requests, issues and reviews are written in English.

### Authorship and AI tools

Commits and pull requests are in your own name, from your own account: no shared accounts, and no second account to approve your own work. AI coding agents are welcome (start them on [AGENTS.md](AGENTS.md)), and you are responsible for every line they write. Crediting an AI tool (`Co-Authored-By: <assistant>`, "Generated with ...") is allowed, but this project recommends leaving it out; the hooks and CI warn about it without failing.

### What enforces this

- **Git hooks** in `.githooks`, switched on by `bun install` (`core.hooksPath`): `pre-commit` refuses commits on `main`, `commit-msg` checks the subject, `pre-push` refuses pushes to `main` and badly named branches. Run a check by hand with `bun run policy branch` or `bun run policy commit-msg <file>`.
- **CI `Policy` job:** on pull requests it checks the branch name, the title, the closing keyword and every commit; on `main` it fails for anything that is not a pull request's merge commit.
- **Repository settings** ([`scripts/github-settings.ts`](scripts/github-settings.ts)): merge commits only, branches deleted on merge. With the repository public, the same script applies the rulesets in [`.github/rulesets`](.github/rulesets): `main` accepts changes only through a pull request with all three checks green and every conversation resolved, can't be force-pushed or deleted, and release tags (`v*`) can't be moved or deleted.

All rules live in one tested module, [`scripts/policy/rules.ts`](scripts/policy/rules.ts).

## Releases

The maintainer cuts releases, following [Semantic Versioning](https://semver.org).

1. Move the `Unreleased` entries in [CHANGELOG.md](CHANGELOG.md) under the new version (through a pull request, like any change).
2. Write the release notes with every section, "None." where it doesn't apply: Summary (1-3 sentences), Highlights, Added, Changed, Fixed, Removed, Deprecated, Security (each referring to its pull requests or commits), Breaking Changes, Migration / Upgrade Guide, Installation, Known Issues, and Full Changelog (`https://github.com/habibiahmada/wrapyourgit/compare/<previous-tag>...vX.Y.Z`). `--generate-notes` output is raw material only.
3. Tag and publish with the same text, after the maintainer has read the draft:

   ```bash
   git tag -a vX.Y.Z -F notes.md
   git push origin vX.Y.Z
   gh release create vX.Y.Z --title "vX.Y.Z" --notes-file notes.md
   ```

Architecture decisions are recorded as ADRs in [docs/architecture/decisions](docs/architecture/decisions). Changing a decision means writing a new ADR that supersedes the old one.

## Code style

TypeScript strict with `noUncheckedIndexedAccess`; Biome formats and lints (`bun run format` fixes most things). Comments explain _why_, not _what_. Tests live next to the code (`foo.ts` → `foo.test.ts`).

## Working with AI coding agents

Agents are welcome. Point them at [AGENTS.md](AGENTS.md) first. You are responsible for every line you submit: read it, run it, and make sure the commit and pull request are in your name. They follow the same workflow and hooks as everyone (see [Authorship and AI tools](#authorship-and-ai-tools)).

## Code of conduct

Everyone taking part agrees to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
