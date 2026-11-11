import { describe, expect, test } from "bun:test";
import { recapDataSchema } from "@wyg/schema";
import {
  type ActivityInput,
  buildRecap,
  hourlyCommits,
  languageShares,
  previousYear,
  starredSummary,
} from "./recap";

const repo = (
  nameWithOwner: string,
  overrides: Partial<ActivityInput["ownedRepos"][number]> = {},
) => ({
  nameWithOwner,
  ownerLogin: nameWithOwner.split("/")[0] ?? "",
  isPrivate: false,
  isFork: false,
  primaryLanguage: "TypeScript",
  stars: 0,
  forks: 0,
  createdAt: "2025-06-01T00:00:00Z",
  ...overrides,
});

const baseInput = (): ActivityInput => ({
  viewer: { login: "octo", name: "Octo Cat", avatarUrl: "https://example.com/a.png" },
  totals: {
    contributions: 12,
    commits: 9,
    issues: 2,
    pullRequests: 3,
    reviews: 4,
    reposWithCommits: 2,
    restricted: 0,
  },
  calendar: [
    { date: "2025-12-31", count: 5 },
    { date: "2026-01-01", count: 2 },
    { date: "2026-01-02", count: 0 },
    { date: "2026-01-04", count: 7 },
    { date: "2026-01-05", count: 3 },
  ],
  commitRepos: [
    {
      repo: repo("octo/app", { stars: 10 }),
      commits: 6,
      languages: {
        totalSize: 100,
        edges: [
          { name: "TypeScript", color: "#3178c6", size: 75 },
          { name: "CSS", color: "#663399", size: 25 },
        ],
      },
    },
    {
      repo: repo("other/lib", { primaryLanguage: "Go" }),
      commits: 3,
      languages: { totalSize: 10, edges: [{ name: "Go", color: "#00ADD8", size: 10 }] },
    },
  ],
  pullRequestRepos: [
    { nameWithOwner: "other/lib", ownerLogin: "other", isPrivate: false, pullRequests: 2 },
    { nameWithOwner: "third/docs", ownerLogin: "third", isPrivate: false, pullRequests: 1 },
  ],
  pullRequests: [{ merged: true }, { merged: false }, { merged: true }],
  issues: [{ closed: true }, { closed: false }],
  ownedRepos: [
    repo("octo/app", { stars: 10, forks: 2 }),
    repo("octo/new", { stars: 3, createdAt: "2026-01-03T10:00:00Z" }),
  ],
  stars: [
    {
      nameWithOwner: "octo/app",
      starredAt: ["2026-01-04T00:00:00Z", "2026-01-01T00:00:00Z", "2025-11-01T00:00:00Z"],
      complete: true,
    },
    { nameWithOwner: "octo/new", starredAt: ["2026-01-05T00:00:00Z"], complete: true },
  ],
  forks: [{ nameWithOwner: "octo/app", createdAt: ["2026-01-02T00:00:00Z"], complete: true }],
  commitSample: {
    authoredAt: ["2026-01-01T15:30:00Z", "2026-01-04T16:10:00Z"],
    reposSampled: 2,
    complete: true,
  },
});

const options = { year: 2026, timezone: "Asia/Jakarta", now: new Date("2026-01-05T12:00:00Z") };

describe("buildRecap", () => {
  test("scope defaults to full and can be set to public", () => {
    expect(buildRecap(baseInput(), options).meta.scope).toBe("full");
    expect(buildRecap(baseInput(), { ...options, scope: "public" }).meta.scope).toBe("public");
  });

  test("produces data that passes the schema", () => {
    expect(() => recapDataSchema.parse(buildRecap(baseInput(), options))).not.toThrow();
  });

  test("provisional period ends on today's date in the user's timezone", () => {
    const late = buildRecap(baseInput(), { ...options, now: new Date("2026-01-05T20:00:00Z") });
    expect(late.meta.periodEnd).toBe("2026-01-06");
    expect(late.meta.isFinal).toBe(false);
  });

  test("final once the year is over", () => {
    const recap = buildRecap(baseInput(), { ...options, now: new Date("2027-01-02T00:00:00Z") });
    expect(recap.meta.periodEnd).toBe("2026-12-31");
    expect(recap.meta.isFinal).toBe(true);
  });

  test("calendar is clipped to the period", () => {
    const recap = buildRecap(baseInput(), options);
    expect(recap.contributions.calendar.map((d) => d.date)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-04",
      "2026-01-05",
    ]);
    expect(recap.contributions.activeDays).toBe(3);
    expect(recap.contributions.longestStreak.days).toBe(2);
    expect(recap.contributions.weekday[0]).toBe(7); // 2026-01-04 is a Sunday
  });

  test("top repositories are ranked by the user's commits", () => {
    const recap = buildRecap(baseInput(), options);
    expect(recap.repositories.top.map((r) => [r.nameWithOwner, r.commits])).toEqual([
      ["octo/app", 6],
      ["other/lib", 3],
    ]);
    expect(recap.repositories.createdThisYear).toBe(1);
  });

  test("stars and forks gained count only events inside the period", () => {
    const recap = buildRecap(baseInput(), options);
    expect(recap.community.starsGained).toEqual({ status: "ok", value: 3, estimated: false });
    expect(recap.community.forksGained).toEqual({ status: "ok", value: 1, estimated: false });
    expect(recap.community.totalStars).toBe(13);
    expect(recap.community.mostStarred?.nameWithOwner).toBe("octo/app");
    expect(recap.community.mostStarredNew?.nameWithOwner).toBe("octo/new");
  });

  test("a capped stargazer walk makes the gain an estimate", () => {
    const input = baseInput();
    input.stars = (input.stars ?? []).map((walk, index) =>
      index === 0 ? { ...walk, complete: false } : walk,
    );
    expect(buildRecap(input, options).community.starsGained).toMatchObject({ estimated: true });
  });

  test("stars gained is unavailable, not 0, when stargazers could not be listed", () => {
    const input = baseInput();
    input.stars = null;
    const recap = buildRecap(input, options);
    expect(recap.community.starsGained.status).toBe("unavailable");
    expect(recap.community.totalStars).toBe(13);
  });

  test("no stars at all means no most-starred repo", () => {
    const input = baseInput();
    input.ownedRepos = input.ownedRepos.map((r) => ({ ...r, stars: 0 }));
    input.stars = [];
    const recap = buildRecap(input, options);
    expect(recap.community.mostStarred).toBeNull();
    expect(recap.community.starsGained).toEqual({ status: "ok", value: 0, estimated: false });
  });

  test("engineering counts merged/closed and external repos", () => {
    const recap = buildRecap(baseInput(), options);
    expect(recap.engineering.prsMerged).toEqual({ status: "ok", value: 2, estimated: false });
    expect(recap.engineering.issuesClosed).toEqual({ status: "ok", value: 1, estimated: false });
    expect(recap.engineering.externalRepos).toBe(2);
  });

  test("merged count is estimated when GitHub hid some PRs", () => {
    const input = baseInput();
    input.totals.pullRequests = 5;
    expect(buildRecap(input, options).engineering.prsMerged).toMatchObject({ estimated: true });
  });

  test("identity is derived from the same input: 3 of 4 days active makes them consistent", () => {
    const { identity } = buildRecap(baseInput(), options);
    expect(identity.archetype).toBe("consistent");
    expect(identity.reasons).toEqual(["Active on 75% of days", "A 2-day streak"]);
  });

  test("merged count is unavailable when no PR details came back", () => {
    const input = baseInput();
    input.pullRequests = [];
    expect(buildRecap(input, options).engineering.prsMerged.status).toBe("unavailable");
  });
});

describe("languageShares", () => {
  test("weights each repo's bytes by the user's commits and normalises to 1", () => {
    const shares = languageShares(baseInput().commitRepos);
    // TypeScript 6 × 0.75 = 4.5, CSS 6 × 0.25 = 1.5, Go 3 × 1 = 3; total 9
    expect(shares).toEqual([
      { name: "TypeScript", color: "#3178c6", share: 0.5 },
      { name: "Go", color: "#00ADD8", share: 3 / 9 },
      { name: "CSS", color: "#663399", share: 1.5 / 9 },
    ]);
  });

  test("repos without language data are skipped", () => {
    expect(languageShares([{ commits: 4, languages: { totalSize: 0, edges: [] } }])).toEqual([]);
  });
});

describe("hourlyCommits", () => {
  test("buckets by local hour and is always estimated", () => {
    const hourly = hourlyCommits(baseInput().commitSample, "Asia/Jakarta");
    expect(hourly.status).toBe("ok");
    if (hourly.status !== "ok") return;
    expect(hourly.estimated).toBe(true);
    expect(hourly.value[22]).toBe(1); // 15:30 UTC = 22:30 WIB
    expect(hourly.value[23]).toBe(1);
  });

  test("unavailable when nothing was sampled", () => {
    const hourly = hourlyCommits({ authoredAt: [], reposSampled: 0, complete: true }, "UTC");
    expect(hourly.status).toBe("unavailable");
  });
});

describe("previousYear", () => {
  const day = (date: string, count: number) => ({ date, count });
  const previous = {
    year: 2025,
    calendar: [
      day("2025-01-01", 3),
      day("2025-01-02", 1),
      day("2025-01-03", 0),
      day("2025-11-03", 2),
      day("2025-11-04", 1),
      day("2025-11-05", 4),
      day("2025-12-31", 5),
    ],
    span: {
      through: "2025-11-04",
      contributions: 7,
      commits: 5,
      issues: 1,
      pullRequests: 1,
      reviews: 0,
      reposWithCommits: 2,
      restricted: 3,
    },
  };

  test("is unavailable, not zero, when last year could not be read", () => {
    expect(previousYear(null).status).toBe("unavailable");
  });

  test("counts days and streaks only up to the same day of the year", () => {
    const result = previousYear(previous);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.value.sameSpan.activeDays).toBe(4);
    expect(result.value.sameSpan.longestStreak).toBe(2);
    expect(result.value.sameSpan.privateCount).toBe(3);
    expect(result.value.sameSpan.through).toBe("2025-11-04");
  });

  test("the full year covers every day of last year", () => {
    const result = previousYear(previous);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.value.fullYear).toEqual({ contributions: 16, activeDays: 6, longestStreak: 3 });
  });

  test("buildRecap passes it through and the result validates", () => {
    const recap = buildRecap(
      { ...baseInput(), previous },
      { year: 2026, timezone: "UTC", now: new Date("2026-11-04T12:00:00Z") },
    );
    expect(recap.previousYear.status).toBe("ok");
    expect(() => recapDataSchema.parse(recap)).not.toThrow();
  });
});

describe("starredSummary", () => {
  const inPeriod = (iso: string) =>
    iso.slice(0, 10) >= "2026-01-01" && iso.slice(0, 10) <= "2026-12-31";
  const star = (
    starredAt: string,
    name: string,
    stars: number,
    primaryLanguage: string | null,
  ) => ({
    starredAt,
    repo: repo(name, { stars, primaryLanguage }),
  });

  test("counts only stars inside the period and ranks the top five by stargazers", () => {
    const result = starredSummary(
      {
        complete: true,
        items: [
          star("2026-11-01T00:00:00Z", "a/one", 10, "Python"),
          star("2026-10-01T00:00:00Z", "b/two", 500, "Python"),
          star("2026-09-01T00:00:00Z", "c/three", 50, "Go"),
          star("2026-08-01T00:00:00Z", "d/four", 900, null),
          star("2026-07-01T00:00:00Z", "e/five", 70, "Rust"),
          star("2026-06-01T00:00:00Z", "f/six", 5, "Python"),
          star("2025-12-31T23:00:00Z", "g/last-year", 99999, "C"),
        ],
      },
      inPeriod,
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.estimated).toBe(false);
    expect(result.value.count).toBe(6);
    expect(result.value.top.map((r) => r.nameWithOwner)).toEqual([
      "d/four",
      "b/two",
      "e/five",
      "c/three",
      "a/one",
    ]);
    expect(result.value.languages).toEqual([
      { name: "Python", count: 3 },
      { name: "Go", count: 1 },
      { name: "Rust", count: 1 },
    ]);
  });

  test("a walk stopped by the page cap is a lower bound, marked estimated", () => {
    const result = starredSummary(
      { complete: false, items: [star("2026-05-01T00:00:00Z", "a/one", 1, "Go")] },
      inPeriod,
    );
    expect(result).toMatchObject({ status: "ok", estimated: true, value: { count: 1 } });
  });

  test("unavailable when GitHub refused, never zero", () => {
    expect(starredSummary(null, inPeriod).status).toBe("unavailable");
  });

  test("buildRecap carries it and the recap stays valid", () => {
    const input = {
      ...baseInput(),
      starred: { complete: true, items: [star("2026-01-02T00:00:00Z", "a/one", 3, "Go")] },
    };
    const recap = buildRecap(input, options);
    expect(recap.starred).toMatchObject({ status: "ok", value: { count: 1 } });
    expect(() => recapDataSchema.parse(recap)).not.toThrow();
  });
});
