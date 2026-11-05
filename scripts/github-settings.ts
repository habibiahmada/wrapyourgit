/**
 * Applies the repository's GitHub settings from this checkout (ADR-0014), so they are versioned
 * and repeatable instead of clicked once in the web UI.
 *
 *   bun scripts/github-settings.ts
 *
 * Needs `gh` signed in as an admin of the repository.
 *
 * 1. Merge settings: merge commits only (no squash, no rebase), branches deleted after merging,
 *    "update branch" allowed, no auto-merge. The merge commit keeps GitHub's default title,
 *    "Merge pull request #N from …", which the CI policy check on main relies on.
 * 2. Rulesets from .github/rulesets/*.json, created or updated by name. Private repositories on
 *    a free plan cannot use rulesets: the script says so and stops there. Run it again after the
 *    repository goes public (or the plan changes).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { $ } from "bun";

const repo = (await $`gh repo view --json nameWithOwner -q .nameWithOwner`.quiet().text()).trim();
console.log(`Repository: ${repo}`);

await $`gh api -X PATCH repos/${repo} \
  -F allow_merge_commit=true \
  -F allow_squash_merge=false \
  -F allow_rebase_merge=false \
  -F allow_auto_merge=false \
  -F delete_branch_on_merge=true \
  -F allow_update_branch=true \
  -f merge_commit_title=MERGE_MESSAGE \
  -f merge_commit_message=PR_TITLE`.quiet();
console.log("✓ Merge settings: merge commits only, branches deleted on merge, update branch on.");

const dir = resolve(import.meta.dir, "../.github/rulesets");
const existing = await $`gh api repos/${repo}/rulesets`.nothrow().quiet();
if (existing.exitCode !== 0) {
  const message = existing.stderr.toString() + existing.stdout.toString();
  if (/Upgrade to GitHub Pro or make this repository public/.test(message)) {
    console.log(
      "• Rulesets are not available for this private repository on the free plan. Make it public (or upgrade), then run this script again.",
    );
    process.exit(0);
  }
  throw new Error(message);
}
const current = JSON.parse(existing.stdout.toString()) as { id: number; name: string }[];

for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
  const path = join(dir, file);
  const { name } = JSON.parse(readFileSync(path, "utf8")) as { name: string };
  const match = current.find((ruleset) => ruleset.name === name);
  if (match) {
    await $`gh api -X PUT repos/${repo}/rulesets/${match.id} --input ${path}`.quiet();
    console.log(`✓ Ruleset "${name}" updated.`);
  } else {
    await $`gh api -X POST repos/${repo}/rulesets --input ${path}`.quiet();
    console.log(`✓ Ruleset "${name}" created.`);
  }
}
