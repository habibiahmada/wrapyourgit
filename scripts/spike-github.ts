/**
 * Spike: can we build valid RecapData for one real account?
 *
 *   GITHUB_TOKEN=$(gh auth token) bun scripts/spike-github.ts
 *
 * Writes the raw activity and the recap to .data/ (gitignored: they may contain private repo
 * names), validates the recap against the schema and prints a summary plus rate-limit cost.
 */
import { buildRecap } from "@wyg/analytics";
import { fetchYearActivity, githubGraphql } from "@wyg/github";
import { EDITION_YEAR, recapDataSchema } from "@wyg/schema";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "GITHUB_TOKEN is not set. Try: GITHUB_TOKEN=$(gh auth token) bun scripts/spike-github.ts",
  );
  process.exit(1);
}

const now = new Date();
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const from = new Date(Date.UTC(EDITION_YEAR, 0, 1));
const to = new Date(Math.min(now.getTime(), Date.UTC(EDITION_YEAR, 11, 31, 23, 59, 59)));

// Count requests by wrapping fetch: the remaining-points delta is useless if the hourly window
// resets mid-sync. Every query here costs 1 point, so requests ≈ points.
let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = Object.assign((...args: Parameters<typeof fetch>) => {
  requests += 1;
  return realFetch(...args);
}, realFetch);

const started = performance.now();
const activity = await fetchYearActivity(token, from, to);
const seconds = ((performance.now() - started) / 1000).toFixed(1);
const { rateLimit } = await githubGraphql<{ rateLimit: { cost: number; remaining: number } }>(
  token,
  "query { rateLimit { cost remaining } }",
);

const login = activity.viewer.login;
await Bun.write(`.data/activity-${login}.json`, JSON.stringify(activity, null, 2));

const recap = recapDataSchema.parse(buildRecap(activity, { year: EDITION_YEAR, timezone, now }));
await Bun.write(`.data/recap-${login}.json`, JSON.stringify(recap, null, 2));

const show = (m: { status: string; value?: unknown; estimated?: boolean; reason?: string }) =>
  m.status === "ok" ? `${m.value}${m.estimated ? " (estimated)" : ""}` : `unavailable: ${m.reason}`;

const repoCommitSum = activity.commitRepos.reduce((total, entry) => total + entry.commits, 0);

console.table({
  login,
  period: `${recap.meta.periodStart} → ${recap.meta.periodEnd} (${timezone})`,
  totalContributions: recap.contributions.total,
  commits: recap.contributions.commits,
  commitsSummedPerRepo: repoCommitSum,
  privateCount: show(recap.contributions.privateCount),
  activeDays: recap.contributions.activeDays,
  longestStreak: recap.contributions.longestStreak.days,
  busiestMonth: recap.contributions.busiestMonth?.month ?? "-",
  hourlySample: `${activity.commitSample.authoredAt.length} commits from ${activity.commitSample.reposSampled} repos`,
  languages: recap.languages.top.map((l) => `${l.name} ${(l.share * 100).toFixed(0)}%`).join(", "),
  distinctLanguages: recap.languages.distinctCount,
  ownedRepos: recap.repositories.ownedTotal,
  contributedTo: recap.repositories.contributedTo,
  createdThisYear: recap.repositories.createdThisYear,
  totalStars: recap.community.totalStars,
  starsGained: show(recap.community.starsGained),
  totalForks: recap.community.totalForks,
  forksGained: show(recap.community.forksGained),
  prsOpened: recap.engineering.prsOpened,
  prsMerged: show(recap.engineering.prsMerged),
  issuesOpened: recap.engineering.issuesOpened,
  issuesClosed: show(recap.engineering.issuesClosed),
  reviews: recap.engineering.reviews,
  externalRepos: recap.engineering.externalRepos,
  syncSeconds: seconds,
  requests,
  rateLimitRemaining: rateLimit.remaining,
});
console.log(`Schema OK. Wrote .data/activity-${login}.json and .data/recap-${login}.json`);
