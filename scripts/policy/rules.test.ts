import { describe, expect, test } from "bun:test";
import {
  branchIssue,
  checkBranch,
  checkCommitMessage,
  checkMainPush,
  checkPullRequest,
  checkSubject,
} from "./rules";

describe("branches", () => {
  test("issue branches pass and name their issue", () => {
    expect(checkBranch("feat/42-weekday-scene").problems).toEqual([]);
    expect(branchIssue("fix/7-utc-day-boundary")).toBe(7);
  });

  test("trivial docs/chore branches and bot branches pass without an issue", () => {
    expect(checkBranch("docs/fix-typo").problems).toEqual([]);
    expect(checkBranch("chore/bump-bun").problems).toEqual([]);
    expect(checkBranch("dependabot/bun/next-16.5.0").problems).toEqual([]);
    expect(branchIssue("docs/fix-typo")).toBeNull();
  });

  test("main, unknown types and free-form names fail", () => {
    expect(checkBranch("main").problems).toHaveLength(1);
    expect(checkBranch("feature/42-x").problems).toHaveLength(1);
    expect(checkBranch("feat/weekday").problems).toHaveLength(1);
    expect(checkBranch("my-branch").problems).toHaveLength(1);
    expect(checkBranch("feat/42-Weekday").problems).toHaveLength(1);
  });
});

describe("commit subjects", () => {
  test("Conventional Commits pass, with or without scope and breaking mark", () => {
    for (const subject of [
      "feat(video): add the weekday scene",
      "fix: count UTC days",
      "chore(deps): bump next",
      "refactor(web)!: drop the old letter",
    ]) {
      expect(checkSubject(subject).problems).toEqual([]);
    }
  });

  test("messages git writes itself pass", () => {
    expect(checkSubject("Merge branch 'main' into feat/42-x").problems).toEqual([]);
    expect(checkSubject('Revert "feat: x"').problems).toEqual([]);
    expect(checkSubject("fixup! feat: x").problems).toEqual([]);
  });

  test("free-form, unknown types and long subjects fail", () => {
    expect(checkSubject("update stuff").problems).toHaveLength(1);
    expect(checkSubject("feature: x").problems).toHaveLength(1);
    expect(checkSubject("feat:x").problems).toHaveLength(1);
    expect(checkSubject(`feat: ${"x".repeat(100)}`).problems).toHaveLength(1);
  });
});

describe("AI attribution", () => {
  test("is a warning, never a failure", () => {
    const verdict = checkCommitMessage(
      "feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n",
    );
    expect(verdict.problems).toEqual([]);
    expect(verdict.warnings).toHaveLength(1);
  });

  test("a human co-author is not flagged", () => {
    expect(checkCommitMessage("feat: x\n\nCo-authored-by: Ana <ana@example.com>").warnings).toEqual(
      [],
    );
  });

  test("comment lines from the editor are ignored", () => {
    expect(checkCommitMessage("# Please enter\nfeat: x").problems).toEqual([]);
  });
});

describe("pull requests", () => {
  const good = {
    branch: "feat/42-weekday",
    title: "feat(video): weekday scene",
    body: "Closes #42",
  };

  test("a conventional title closing the branch's issue passes", () => {
    expect(checkPullRequest(good)).toEqual({ problems: [], warnings: [] });
    expect(checkPullRequest({ ...good, body: "Fixes #42 and more" }).problems).toEqual([]);
  });

  test("a missing or wrong closing keyword fails", () => {
    expect(checkPullRequest({ ...good, body: "Related to #42" }).problems).toHaveLength(1);
    expect(checkPullRequest({ ...good, body: "Closes #420" }).problems).toHaveLength(1);
  });

  test("a free-form title fails", () => {
    expect(checkPullRequest({ ...good, title: "Weekday scene" }).problems).toHaveLength(1);
  });

  test("trivial branches need no issue; dependabot is exempt", () => {
    expect(
      checkPullRequest({ branch: "docs/typo", title: "docs: fix a typo", body: "" }).problems,
    ).toEqual([]);
    expect(
      checkPullRequest({ branch: "dependabot/bun/x", title: "Bump x", body: "" }).problems,
    ).toEqual([]);
  });
});

describe("pushes to main", () => {
  test("a pull request merge commit passes", () => {
    expect(
      checkMainPush({ parents: 2, subject: "Merge pull request #27 from habibiahmada/feat/26-x" })
        .problems,
    ).toEqual([]);
  });

  test("a direct commit or a squash merge is flagged", () => {
    expect(checkMainPush({ parents: 1, subject: "feat: x (#27)" }).problems).toHaveLength(1);
    expect(checkMainPush({ parents: 2, subject: "Merge branch 'x'" }).problems).toHaveLength(1);
  });
});
