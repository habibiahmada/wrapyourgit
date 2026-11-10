import { describe, expect, test } from "bun:test";
import { type RecapData, type RepoRef, recapDataSchema, SCHEMA_VERSION } from "@wyg/schema";
import { toPublicRecap, withoutPrivateNames } from "./public";

const repo = (nameWithOwner: string, isPrivate: boolean): RepoRef => ({
  nameWithOwner,
  isPrivate,
  isFork: false,
  primaryLanguage: "TypeScript",
  stars: 3,
  forks: 1,
  createdAt: "2026-02-01T00:00:00Z",
});

const recap = (): RecapData => ({
  meta: {
    schemaVersion: SCHEMA_VERSION,
    year: 2026,
    periodStart: "2026-01-01",
    periodEnd: "2026-11-04",
    isFinal: false,
    generatedAt: "2026-11-04T10:00:00.000Z",
    timezone: "Asia/Jakarta",
  },
  profile: { login: "octo", name: "Octo", avatarUrl: "https://example.com/a.png" },
  contributions: {
    total: 100,
    commits: 80,
    privateCount: { status: "ok", value: 40, estimated: false },
    activeDays: 30,
    longestStreak: { days: 5, start: "2026-03-01", end: "2026-03-05" },
    busiestMonth: { month: 3, count: 40 },
    busiestDay: { date: "2026-01-01", count: 2 },
    monthly: Array(12).fill(0),
    weekday: Array(7).fill(0),
    hourly: { status: "ok", value: Array(24).fill(1), estimated: true },
    calendar: [{ date: "2026-01-01", count: 2 }],
  },
  languages: { top: [], distinctCount: 0 },
  repositories: {
    ownedTotal: 4,
    contributedTo: 3,
    createdThisYear: 1,
    top: [
      { ...repo("octo/secret-client", true), commits: 50 },
      { ...repo("octo/public-lib", false), commits: 20 },
    ],
  },
  community: {
    totalStars: 6,
    starsGained: { status: "ok", value: 2, estimated: false },
    totalForks: 2,
    forksGained: { status: "ok", value: 1, estimated: false },
    mostStarred: repo("octo/secret-client", true),
    mostStarredNew: repo("octo/public-lib", false),
    mostForked: repo("octo/secret-client", true),
  },
  engineering: {
    prsOpened: 3,
    prsMerged: { status: "ok", value: 2, estimated: false },
    issuesOpened: 1,
    issuesClosed: { status: "ok", value: 1, estimated: false },
    reviews: 0,
    externalRepos: 1,
  },
  previousYear: { status: "unavailable", reason: "Not fetched in this test" },
  starred: {
    status: "ok",
    estimated: false,
    value: {
      count: 3,
      top: [repo("someone/secret-tool", true), repo("vercel/next.js", false)],
      languages: [{ name: "TypeScript", count: 2 }],
    },
  },
  identity: { archetype: "builder", scores: { builder: 0.7 }, reasons: ["80 commits"] },
});

describe("toPublicRecap", () => {
  test("no private repository name survives anywhere in the document", () => {
    const published = JSON.stringify(toPublicRecap(recap()));
    expect(published).not.toContain("secret-client");
  });

  test("private repos leave the top list; public ones keep their place", () => {
    const { repositories } = toPublicRecap(recap());
    expect(repositories.top.map((r) => r.nameWithOwner)).toEqual(["octo/public-lib"]);
  });

  test("private most-starred / most-forked become null, public ones stay", () => {
    const { community } = toPublicRecap(recap());
    expect(community.mostStarred).toBeNull();
    expect(community.mostForked).toBeNull();
    expect(community.mostStarredNew?.nameWithOwner).toBe("octo/public-lib");
  });

  test("private repositories you starred are dropped from the list; the count stays", () => {
    const { starred } = toPublicRecap(recap());
    expect(starred.status).toBe("ok");
    if (starred.status !== "ok") return;
    expect(starred.value.top.map((r) => r.nameWithOwner)).toEqual(["vercel/next.js"]);
    expect(starred.value.count).toBe(3);
  });

  test("aggregate counts are kept: they never name a repo", () => {
    const published = toPublicRecap(recap());
    expect(published.contributions.total).toBe(100);
    expect(published.contributions.privateCount).toEqual({
      status: "ok",
      value: 40,
      estimated: false,
    });
    expect(published.repositories.ownedTotal).toBe(4);
  });

  test("the result is still valid RecapData, so the story renders it unchanged", () => {
    expect(() => recapDataSchema.parse(toPublicRecap(recap()))).not.toThrow();
  });

  test("habits that hint at location or routine stay private: timezone and commit hours", () => {
    const published = toPublicRecap(recap());
    expect(published.meta.timezone).toBe("UTC");
    expect(published.contributions.hourly.status).toBe("unavailable");
  });

  test("does not mutate the stored recap", () => {
    const original = recap();
    toPublicRecap(original);
    expect(original.repositories.top).toHaveLength(2);
  });
});

describe("withoutPrivateNames", () => {
  test("drops every private name but keeps timezone and commit hours", () => {
    const input = recap();
    const result = withoutPrivateNames(input);
    expect(JSON.stringify(result)).not.toContain("secret-");
    expect(result.meta.timezone).toBe("Asia/Jakarta");
    expect(result.contributions.hourly).toEqual(input.contributions.hourly);
    expect(result.contributions.total).toBe(100);
  });
});

// The video package can't depend on analytics, so the check that exports carry only the public
// projection lives here, where both are reachable.
describe("world exports of the public projection", () => {
  test("no private repository name reaches the composition props or the file names", async () => {
    const { sampleRecap } = await import("../../video/src/fixtures/sample-recap");
    const { worldExportComposition, exportFileName } = await import("../../video/src/world/export");
    const publicData = toPublicRecap(sampleRecap);
    const privateNames = sampleRecap.repositories.top
      .filter((r) => r.isPrivate)
      .map((r) => r.nameWithOwner);
    expect(privateNames.length).toBeGreaterThan(0);
    const exported = JSON.stringify([
      worldExportComposition(publicData, "9x16"),
      exportFileName("mp4", publicData, { format: "9x16" }),
    ]);
    for (const name of privateNames) expect(exported).not.toContain(name);
  });
});
