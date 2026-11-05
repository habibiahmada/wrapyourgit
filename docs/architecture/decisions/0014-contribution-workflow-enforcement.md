# 0014. The contribution workflow is enforced by hooks, a CI check and rulesets

- Status: Accepted
- Date: 2026-11-05

## Context

The workflow (issue, `<type>/<issue>-<slug>` branch, Conventional Commits, pull request with `Closes #N`, merge commit after green CI) was written down only in part and enforced nowhere: direct commits to `main` were possible, squash and rebase merges were allowed, and merged branches stayed behind. The maintainer asked for strict rules. The repository is private on a free plan, where GitHub returns 403 for branch protection and rulesets; it will go public.

## Decision

1. **One rule set, in code.** `scripts/policy/rules.ts` holds the rules as pure, tested functions: branch names (`<type>/<issue>-<slug>`, or `docs|chore/<slug>` for trivial changes, Dependabot exempt), Conventional Commit subjects up to 100 characters (git's own merge, revert and fixup messages pass), a pull request title like a commit subject, a closing keyword for the branch's issue, and `main` taking only GitHub's "Merge pull request #N" commits.
2. **AI attribution is a warning, not a failure.** Crediting an AI tool in a commit or pull request is allowed; the maintainer recommends leaving it out, so the check says so and passes.
3. **Local git hooks** in `.githooks`, switched on by the root `prepare` script (`git config core.hooksPath .githooks`) on `bun install`: `pre-commit` refuses commits on `main`, `commit-msg` checks the subject, `pre-push` refuses pushes to `main` and badly named branches. Tags pass, for releases.
4. **CI `Policy` job** (`scripts/policy/cli.ts`): on pull requests, the branch, title, closing keyword and every commit; on pushes to `main`, every first-parent commit must be a pull request merge. It needs no install, only Bun and git.
5. **Repository settings as code** (`scripts/github-settings.ts`): merge commits only, branches deleted on merge, update branch allowed, no auto-merge, GitHub's default merge commit title kept (the `main` check reads it).
6. **Rulesets as code** (`.github/rulesets`), applied by the same script once rulesets are available: `main` needs a pull request with `Policy`, `Lint, typecheck, test` and `Build web` green and up to date, all conversations resolved, merge commits only, no force push or deletion, and no bypass; release tags `v*` can't be moved or deleted. Required approvals stay at zero: the maintainer is the only reviewer and GitHub doesn't let authors approve their own pull requests.

## Alternatives

- **Upgrade to GitHub Pro now:** server-side protection while private, at a monthly cost. The repository is going public, which gives the same for free.
- **commitlint and husky:** familiar tools, but two dependencies and a config for rules that fit in one small module shared with CI.
- **Fail on AI attribution:** stricter, but the maintainer allows it.

## Consequences

- Until the repository is public, `main` is protected only by the hooks (which `--no-verify` skips) and by CI failing loudly after the fact; GitHub itself can still merge a red pull request or accept a direct push. After it goes public, run `bun scripts/github-settings.ts` once.
- Commits that reached `main` before this decision are not checked again; the `main` check runs per push.
- A new branch type or rule means changing `rules.ts` and its tests, then CONTRIBUTING.md.
