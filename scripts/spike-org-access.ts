/**
 * Spike for #79: what a GitHub App installation on an organisation changes in a member's
 * contributions. Reads the app user token written by `scripts/github-app-token.ts` (never prints
 * it) and reports, for the year so far, the contributions GitHub keeps restricted and the ones it
 * details, with the detailed ones in the organisation counted per kind. Repository names are not
 * printed: they can be private.
 *
 *   bun scripts/spike-org-access.ts Webekspres            # writes .data/org-access-<org>-<time>.json
 *   bun scripts/spike-org-access.ts Webekspres --compare before.json
 *
 * Run once before the organisation's owner installs the app, once after, and compare.
 */
import { readFile } from "node:fs/promises";

const org = process.argv[2];
if (!org) {
  console.error("Usage: bun scripts/spike-org-access.ts <organisation> [--compare <file>]");
  process.exit(1);
}
const compareIndex = process.argv.indexOf("--compare");
const compareWith = compareIndex > -1 ? process.argv[compareIndex + 1] : undefined;

const token = (await readFile(".data/github-app-token", "utf8").catch(() => "")).trim();
if (!token) {
  console.error("No token in .data/github-app-token: run scripts/github-app-token.ts first.");
  process.exit(1);
}

const year = new Date().getUTCFullYear();
const from = `${year}-01-01T00:00:00Z`;
const to = new Date().toISOString();

const query = `query($from: DateTime!, $to: DateTime!) {
  viewer {
    login
    contributionsCollection(from: $from, to: $to) {
      restrictedContributionsCount
      hasAnyRestrictedContributions
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      commitContributionsByRepository(maxRepositories: 100) {
        repository { owner { login } isPrivate }
        contributions { totalCount }
      }
      pullRequestContributionsByRepository(maxRepositories: 100) {
        repository { owner { login } isPrivate }
        contributions { totalCount }
      }
      pullRequestReviewContributionsByRepository(maxRepositories: 100) {
        repository { owner { login } isPrivate }
        contributions { totalCount }
      }
      issueContributionsByRepository(maxRepositories: 100) {
        repository { owner { login } isPrivate }
        contributions { totalCount }
      }
    }
  }
}`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { from, to } }),
});
if (response.status === 401) {
  console.error(
    "The token was refused (401): it has probably expired. Get a new one with scripts/github-app-token.ts.",
  );
  process.exit(1);
}
const body = (await response.json()) as {
  data?: { viewer: { login: string; contributionsCollection: Record<string, unknown> } };
  errors?: { message: string }[];
};
if (!body.data) {
  console.error(`GitHub answered with errors: ${body.errors?.map((e) => e.message).join("; ")}`);
  process.exit(1);
}

type ByRepo = {
  repository: { owner: { login: string }; isPrivate: boolean };
  contributions: { totalCount: number };
}[];
const c = body.data.viewer.contributionsCollection;
const inOrg = (list: unknown) => {
  const rows = (list as ByRepo).filter(
    (r) => r.repository.owner.login.toLowerCase() === org.toLowerCase(),
  );
  return {
    repositories: rows.length,
    privateRepositories: rows.filter((r) => r.repository.isPrivate).length,
    contributions: rows.reduce((sum, r) => sum + r.contributions.totalCount, 0),
  };
};

const report = {
  takenAt: to,
  login: body.data.viewer.login,
  org,
  restricted: c.restrictedContributionsCount,
  totals: {
    commits: c.totalCommitContributions,
    pullRequests: c.totalPullRequestContributions,
    reviews: c.totalPullRequestReviewContributions,
    issues: c.totalIssueContributions,
  },
  inOrg: {
    commits: inOrg(c.commitContributionsByRepository),
    pullRequests: inOrg(c.pullRequestContributionsByRepository),
    reviews: inOrg(c.pullRequestReviewContributionsByRepository),
    issues: inOrg(c.issueContributionsByRepository),
  },
};

const out = `.data/org-access-${org}-${to.replace(/[:.]/g, "-")}.json`;
await Bun.write(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`Saved to ${out}`);

if (compareWith) {
  const before = JSON.parse(await readFile(compareWith, "utf8")) as typeof report;
  console.log("\nChange since", before.takenAt);
  console.log("restricted:", before.restricted, "->", report.restricted);
  for (const kind of ["commits", "pullRequests", "reviews", "issues"] as const) {
    const a = before.inOrg[kind];
    const b = report.inOrg[kind];
    console.log(
      `${kind} in ${org}:`,
      `${a.contributions} in ${a.repositories} repos`,
      "->",
      `${b.contributions} in ${b.repositories} repos (${b.privateRepositories} private)`,
    );
  }
}
