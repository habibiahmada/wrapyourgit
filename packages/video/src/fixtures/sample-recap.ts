import { type RecapData, type RepoRef, SCHEMA_VERSION } from "@wyg/schema";

/** Fake data for Remotion Studio and visual tests. Not a real account. */
const calendar = Array.from({ length: 365 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
  return { date, count: (i * 7) % 5 === 0 ? 0 : (i * 13) % 9 };
});

const repo = (nameWithOwner: string, extra: Partial<RepoRef> = {}): RepoRef => ({
  nameWithOwner,
  isPrivate: false,
  isFork: false,
  primaryLanguage: "TypeScript",
  stars: 0,
  forks: 0,
  createdAt: "2025-03-01T00:00:00Z",
  ...extra,
});

const trailmix = repo("octo-sample/trailmix", { stars: 211, createdAt: "2026-02-10T00:00:00Z" });

export const sampleRecap: RecapData = {
  meta: {
    schemaVersion: SCHEMA_VERSION,
    year: 2026,
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    isFinal: true,
    generatedAt: "2027-01-01T00:00:00.000Z",
    timezone: "Asia/Jakarta",
  },
  profile: { login: "octo-sample", name: "Sample Dev", avatarUrl: "https://github.com/ghost.png" },
  contributions: {
    total: 1284,
    commits: 942,
    privateCount: { status: "ok", value: 210, estimated: false },
    activeDays: 186,
    longestStreak: { days: 24, start: "2026-06-02", end: "2026-06-25" },
    busiestMonth: { month: 6, count: 214 },
    monthly: [80, 75, 120, 98, 110, 214, 130, 90, 101, 95, 88, 83],
    weekday: [90, 220, 240, 230, 210, 190, 104],
    hourly: { status: "unavailable", reason: "Not computed in fixture" },
    calendar,
  },
  languages: {
    top: [
      { name: "TypeScript", color: "#3178c6", share: 0.42 },
      { name: "JavaScript", color: "#f1e05a", share: 0.28 },
      { name: "Python", color: "#3572A5", share: 0.18 },
    ],
    distinctCount: 7,
  },
  repositories: {
    ownedTotal: 34,
    contributedTo: 12,
    createdThisYear: 6,
    top: [
      { ...trailmix, commits: 312 },
      { ...repo("octo-sample/client-portal", { isPrivate: true }), commits: 188 },
      { ...repo("octo-sample/dotfiles", { primaryLanguage: "Shell", stars: 14 }), commits: 96 },
      { ...repo("acme/design-tokens", { primaryLanguage: "JavaScript" }), commits: 41 },
      { ...repo("octo-sample/notes", { primaryLanguage: "Python" }), commits: 12 },
    ],
  },
  community: {
    totalStars: 412,
    starsGained: { status: "ok", value: 128, estimated: false },
    totalForks: 37,
    forksGained: { status: "ok", value: 12, estimated: false },
    mostStarred: trailmix,
    mostStarredNew: trailmix,
    mostForked: null,
  },
  engineering: {
    prsOpened: 64,
    prsMerged: { status: "ok", value: 51, estimated: false },
    issuesOpened: 23,
    issuesClosed: { status: "unavailable", reason: "Not computed in fixture" },
    reviews: 40,
    externalRepos: 5,
  },
  previousYear: {
    status: "ok",
    estimated: false,
    value: {
      year: 2025,
      sameSpan: {
        through: "2025-12-31",
        contributions: 1031,
        commits: 640,
        pullRequests: 48,
        issues: 21,
        reviews: 33,
        reposWithCommits: 9,
        privateCount: 210,
        activeDays: 162,
        longestStreak: 14,
      },
      fullYear: { contributions: 1031, activeDays: 162, longestStreak: 14 },
    },
  },
  identity: {
    archetype: "builder",
    scores: { builder: 0.72, consistent: 0.55 },
    reasons: ["1,204 commits to your own repositories", "6 new repositories this year"],
  },
};
