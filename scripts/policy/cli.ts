/**
 * Runs the contribution rules (rules.ts) from git hooks and CI.
 *
 *   bun scripts/policy/cli.ts commit-msg <file>   # .githooks/commit-msg
 *   bun scripts/policy/cli.ts branch [name]       # current branch by default
 *   bun scripts/policy/cli.ts pre-push            # .githooks/pre-push, reads git's stdin
 *   bun scripts/policy/cli.ts pr                  # CI on pull_request (GITHUB_EVENT_PATH)
 *   bun scripts/policy/cli.ts main-push           # CI on push to main (GITHUB_EVENT_PATH)
 *
 * Exits 1 when a rule fails; warnings are printed and pass. In GitHub Actions the output uses
 * workflow annotations, so problems show on the pull request.
 */

import { readFileSync } from "node:fs";
import { $ } from "bun";
import {
  checkBranch,
  checkCommitMessage,
  checkMainPush,
  checkPullRequest,
  type Verdict,
} from "./rules";

const ci = process.env.GITHUB_ACTIONS === "true";

function report(verdicts: Verdict[]): never {
  const problems = verdicts.flatMap((v) => v.problems);
  const warnings = verdicts.flatMap((v) => v.warnings);
  for (const warning of warnings)
    console.log(ci ? `::warning title=Policy::${warning}` : `⚠ ${warning}`);
  for (const problem of problems)
    console.log(ci ? `::error title=Policy::${problem}` : `✗ ${problem}`);
  if (problems.length > 0) {
    if (!ci) console.log('\nSee CONTRIBUTING.md, "Workflow".');
    process.exit(1);
  }
  process.exit(0);
}

async function currentBranch(): Promise<string> {
  return (await $`git symbolic-ref --short HEAD`.quiet().text()).trim();
}

/** Full messages of the commits in `range`, merges excluded. */
async function messages(range: string): Promise<string[]> {
  const out = await $`git log --no-merges --format=%B%x1e ${range}`.quiet().text();
  return out
    .split("\x1e")
    .map((message) => message.trim())
    .filter(Boolean);
}

function event(): Record<string, unknown> {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path)
    throw new Error("GITHUB_EVENT_PATH is not set: this subcommand runs in GitHub Actions.");
  return JSON.parse(readFileSync(path, "utf8"));
}

const [command, arg] = process.argv.slice(2);

switch (command) {
  case "commit-msg": {
    if (!arg) throw new Error("commit-msg needs the message file");
    report([checkCommitMessage(readFileSync(arg, "utf8"))]);
    break;
  }
  case "branch": {
    report([checkBranch(arg ?? (await currentBranch()))]);
    break;
  }
  case "pre-push": {
    // git feeds "<local ref> <local sha> <remote ref> <remote sha>" per ref being pushed.
    const lines = (await Bun.stdin.text()).split("\n").filter(Boolean);
    const verdicts: Verdict[] = [];
    for (const line of lines) {
      const remoteRef = line.split(" ")[2] ?? "";
      if (!remoteRef.startsWith("refs/heads/")) continue; // tags (releases) are fine
      verdicts.push(checkBranch(remoteRef.slice("refs/heads/".length)));
    }
    report(verdicts);
    break;
  }
  case "pr": {
    const pr = event().pull_request as {
      title: string;
      body: string | null;
      head: { ref: string; sha: string };
      base: { sha: string };
    };
    const verdicts = [
      checkPullRequest({ branch: pr.head.ref, title: pr.title, body: pr.body ?? "" }),
    ];
    if (!pr.head.ref.startsWith("dependabot/")) {
      for (const message of await messages(`${pr.base.sha}..${pr.head.sha}`)) {
        verdicts.push(checkCommitMessage(message));
      }
    }
    report(verdicts);
    break;
  }
  case "main-push": {
    const push = event() as { before: string; after: string };
    // A brand-new branch has no "before"; only check pushes onto existing history.
    const range = /^0+$/.test(push.before)
      ? `${push.after}~1..${push.after}`
      : `${push.before}..${push.after}`;
    const shas = (await $`git rev-list --first-parent ${range}`.quiet().text())
      .split("\n")
      .filter(Boolean);
    const verdicts: Verdict[] = [];
    for (const sha of shas) {
      const [parents = "", subject = ""] = (
        await $`git log -1 --format=%P%x1f%s ${sha}`.quiet().text()
      )
        .trim()
        .split("\x1f");
      verdicts.push(checkMainPush({ parents: parents.split(" ").filter(Boolean).length, subject }));
    }
    report(verdicts);
    break;
  }
  default:
    console.log(
      "Usage: bun scripts/policy/cli.ts <commit-msg FILE | branch [NAME] | pre-push | pr | main-push>",
    );
    process.exit(2);
}
