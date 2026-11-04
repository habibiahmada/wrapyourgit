/**
 * Spike: can we get the numbers we need for one real account?
 *
 *   GITHUB_TOKEN=$(gh auth token) bun scripts/spike-github.ts
 *
 * Writes the raw response to .data/ (gitignored: it may contain private repo names)
 * and prints a summary computed by @wyg/analytics.
 */
import { busiestMonth, countActiveDays, longestStreak } from "@wyg/analytics";
import { fetchContributions } from "@wyg/github";
import { EDITION_YEAR } from "@wyg/schema";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "GITHUB_TOKEN is not set. Try: GITHUB_TOKEN=$(gh auth token) bun scripts/spike-github.ts",
  );
  process.exit(1);
}

const from = new Date(Date.UTC(EDITION_YEAR, 0, 1));
const to = new Date(Math.min(Date.now(), Date.UTC(EDITION_YEAR, 11, 31, 23, 59, 59)));

const raw = await fetchContributions(token, from, to);
await Bun.write(`.data/contributions-${raw.viewer.login}.json`, JSON.stringify(raw, null, 2));

const collection = raw.viewer.contributionsCollection;
const calendar = collection.contributionCalendar.weeks
  .flatMap((week) => week.contributionDays)
  .filter((day) => day.date.startsWith(String(EDITION_YEAR)))
  .map((day) => ({ date: day.date, count: day.contributionCount }));

console.table({
  login: raw.viewer.login,
  period: `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`,
  totalContributions: collection.contributionCalendar.totalContributions,
  commits: collection.totalCommitContributions,
  pullRequests: collection.totalPullRequestContributions,
  issues: collection.totalIssueContributions,
  reviews: collection.totalPullRequestReviewContributions,
  privateContributions: collection.restrictedContributionsCount,
  reposWithCommits: collection.totalRepositoriesWithContributedCommits,
  activeDays: countActiveDays(calendar),
  longestStreak: longestStreak(calendar).days,
  busiestMonth: busiestMonth(calendar)?.month ?? "-",
});
