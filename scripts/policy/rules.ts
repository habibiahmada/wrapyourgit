/**
 * The contribution rules as pure functions (ADR-0014, CONTRIBUTING.md "Workflow"). One source for
 * the git hooks (.githooks) and the CI "Policy" job (scripts/policy/cli.ts), so a check that
 * passes locally passes in CI. Each check returns problems (fail) and warnings (pass, but said).
 */

/** Conventional Commit types this repository uses. */
export const TYPES = [
  "feat",
  "fix",
  "docs",
  "refactor",
  "chore",
  "test",
  "perf",
  "ci",
  "build",
  "revert",
  "style",
] as const;

const TYPE = `(?:${TYPES.join("|")})`;

/** `type(scope)!: subject`, scope optional, at most 100 characters. */
const CONVENTIONAL = new RegExp(`^${TYPE}(?:\\([a-z0-9][a-z0-9-]*\\))?!?: \\S.*$`);
export const MAX_SUBJECT = 100;

/** `<type>/<issue>-<slug>`, e.g. feat/42-weekday-scene. */
const ISSUE_BRANCH = new RegExp(`^${TYPE}/(\\d+)-[a-z0-9]+(?:-[a-z0-9]+)*$`);
/** Trivial changes (a typo, one line of docs) may skip the issue: docs/<slug> or chore/<slug>. */
const TRIVIAL_BRANCH = /^(?:docs|chore)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Branches GitHub tools create on their own. */
const BOT_BRANCH = /^dependabot\//;

/** Messages git writes itself: a merge from main into a branch, a revert, fixups for a rebase. */
const GENERATED =
  /^(?:Merge (?:branch|remote-tracking branch|pull request) |Revert "|fixup! |squash! |amend! )/;

/** Commit or PR trailers and footers that credit an AI tool. Allowed, but not recommended. */
const AI_ATTRIBUTION =
  /(?:co-authored-by:[^\n]*(?:claude|anthropic|copilot|openai|chatgpt|gemini|cursor|codex|devin)|generated (?:with|by) \[?(?:claude|chatgpt|copilot|gemini|cursor|codex)|🤖)/i;

export type Verdict = { problems: string[]; warnings: string[] };

const verdict = (): Verdict => ({ problems: [], warnings: [] });

/** The issue number a branch name points at, or null (trivial and bot branches). */
export function branchIssue(branch: string): number | null {
  const match = ISSUE_BRANCH.exec(branch);
  return match?.[1] ? Number(match[1]) : null;
}

export function checkBranch(branch: string): Verdict {
  const out = verdict();
  if (branch === "main" || branch === "master") {
    out.problems.push("Work happens on a branch, never on main.");
  } else if (
    !ISSUE_BRANCH.test(branch) &&
    !TRIVIAL_BRANCH.test(branch) &&
    !BOT_BRANCH.test(branch)
  ) {
    out.problems.push(
      `Branch "${branch}" should be <type>/<issue>-<slug> (e.g. feat/42-weekday-scene), from \`gh issue develop\`. Types: ${TYPES.join(", ")}. A trivial docs or chore change may use docs/<slug> or chore/<slug>.`,
    );
  }
  return out;
}

/** A commit subject (first line). Messages git generates itself are accepted as they are. */
export function checkSubject(subject: string): Verdict {
  const out = verdict();
  if (GENERATED.test(subject)) return out;
  if (!CONVENTIONAL.test(subject)) {
    out.problems.push(
      `"${subject}" is not a Conventional Commit: <type>(<scope>): <subject>, e.g. "feat(video): add the weekday scene". Types: ${TYPES.join(", ")}.`,
    );
  } else if (subject.length > MAX_SUBJECT) {
    out.problems.push(`Subject is ${subject.length} characters; keep it within ${MAX_SUBJECT}.`);
  }
  return out;
}

/** A whole commit message: the subject rules, plus a warning for AI attribution. */
export function checkCommitMessage(message: string): Verdict {
  const lines = message.split("\n").filter((line) => !line.startsWith("#"));
  const subject = (lines[0] ?? "").trim();
  const out = checkSubject(subject);
  if (AI_ATTRIBUTION.test(message)) {
    out.warnings.push(
      `Commit "${subject}" credits an AI tool. That is allowed, but this project recommends leaving it out: the author is responsible for every line.`,
    );
  }
  return out;
}

/** A pull request: title like a commit subject, and a closing keyword for the branch's issue. */
export function checkPullRequest(pr: { branch: string; title: string; body: string }): Verdict {
  const out = verdict();
  if (BOT_BRANCH.test(pr.branch)) return out;
  const branch = checkBranch(pr.branch);
  out.problems.push(...branch.problems);
  const title = checkSubject(pr.title);
  out.problems.push(...title.problems.map((problem) => `PR title: ${problem}`));
  const issue = branchIssue(pr.branch);
  if (issue !== null) {
    const closes = new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?) #${issue}\\b`, "i");
    if (!closes.test(pr.body)) {
      out.problems.push(
        `The PR body should say "Closes #${issue}" (the issue in the branch name).`,
      );
    }
  }
  if (AI_ATTRIBUTION.test(pr.body)) {
    out.warnings.push("The PR body credits an AI tool. Allowed, but recommended against.");
  }
  return out;
}

/**
 * A push to main is fine when it is a pull request's merge commit (two parents, GitHub's merge
 * message). Anything else went around the pull request.
 */
export function checkMainPush(commit: { parents: number; subject: string }): Verdict {
  const out = verdict();
  if (commit.parents < 2 || !/^Merge pull request #\d+ from /.test(commit.subject)) {
    out.problems.push(
      `"${commit.subject}" reached main without a pull request. Every change goes issue → branch → PR → merge commit (CONTRIBUTING.md).`,
    );
  }
  return out;
}
