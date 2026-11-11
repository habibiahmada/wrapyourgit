import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { AccountLookup, PreviousYearActivity, YearActivity } from "@wyg/github";
import { SCHEMA_VERSION } from "@wyg/schema";

// public-recaps.ts is server-only; the guard throws outside a React server bundle.
mock.module("server-only", () => ({}));
const { loadPublicRecapWith } = await import("./public-recaps");
type Deps = Parameters<typeof loadPublicRecapWith>[0];
type Store = Deps["store"];
type Row = NonNullable<Awaited<ReturnType<Store["read"]>>>;

const ID = 42;
const HOUR = 60 * 60 * 1000;

const activity = (login: string): YearActivity => ({
  viewer: { id: "U_1", login, name: null, avatarUrl: "https://example.com/a.png" },
  totals: {
    contributions: 3,
    commits: 3,
    issues: 0,
    pullRequests: 0,
    reviews: 0,
    reposWithCommits: 1,
    restricted: 0,
  },
  calendar: [{ date: "2026-03-01", count: 3 }],
  commitRepos: [],
  pullRequestRepos: [],
  pullRequests: [],
  issues: [],
  ownedRepos: [],
  stars: null,
  forks: [],
  starred: null,
  commitSample: { authoredAt: [], reposSampled: 0, complete: true },
});

/** Last year as GitHub returns it: the span ends on the `spanTo` it was asked for. */
const previousYear = (through: string): PreviousYearActivity => ({
  year: 2025,
  calendar: [{ date: "2025-03-01", count: 1 }],
  span: {
    contributions: 1,
    commits: 1,
    issues: 0,
    pullRequests: 0,
    reviews: 0,
    reposWithCommits: 1,
    restricted: 0,
    through,
  },
});

let clock: number;
let row: Row | null;
let hidden: boolean;
let lookups: number;
let recorded: string[];
let othersClaim: boolean;
let account: AccountLookup;
let calls: { year: number; previous: number };
let failYear: boolean;
let failPrevious: boolean;
let onSleep: (() => void) | null;

const store: Store = {
  isHidden: async () => hidden,
  read: async () => (row ? { ...row } : null),
  countLookups: async () => lookups,
  recordLookup: async (client) => {
    recorded.push(client);
  },
  claim: async (_id, login) => {
    if (othersClaim) return null;
    row = row
      ? { ...row, login, fetchingSince: new Date(clock) }
      : {
          login,
          data: null,
          schemaVersion: null,
          previous: null,
          fetchedAt: null,
          fetchingSince: new Date(clock),
        };
    return { ...row };
  },
  save: async (_id, saved) => {
    row = {
      ...saved,
      schemaVersion: SCHEMA_VERSION,
      fetchedAt: new Date(clock),
      fetchingSince: null,
    };
  },
  release: async () => {
    if (row) row = { ...row, fetchingSince: null };
  },
};

const deps: Deps = {
  lookup: async () => account,
  fetchYear: async (login) => {
    calls.year++;
    if (failYear) throw new Error("boom");
    return activity(login);
  },
  fetchPrevious: async (_login, _year, spanTo) => {
    calls.previous++;
    if (failPrevious) throw new Error("boom");
    return previousYear(spanTo.toISOString().slice(0, 10));
  },
  store,
  now: () => new Date(clock),
  sleep: async (ms) => {
    clock += ms;
    onSleep?.();
  },
};

/** Runs one lookup that fetches, so the store holds a recap fetched at the current clock. */
async function seed() {
  const result = await loadPublicRecapWith(deps, "octo", "client-a");
  expect(result.kind).toBe("recap");
  recorded = [];
  calls = { year: 0, previous: 0 };
}

beforeEach(() => {
  clock = Date.parse("2026-11-11T12:00:00Z");
  row = null;
  hidden = false;
  lookups = 0;
  recorded = [];
  othersClaim = false;
  account = { kind: "user", id: ID, login: "Octo", remaining: 5000, resetAt: "" };
  calls = { year: 0, previous: 0 };
  failYear = false;
  failPrevious = false;
  onSleep = null;
  // Failures are logged on purpose; keep the test output clean.
  spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  mock.restore();
});

describe("loadPublicRecapWith", () => {
  test("missing and organisation accounts are answered from the lookup alone", async () => {
    account = { kind: "missing", remaining: 5000, resetAt: "" };
    expect(await loadPublicRecapWith(deps, "nobody", "c")).toEqual({
      kind: "missing",
      login: "nobody",
    });
    account = { kind: "organization", login: "Vercel", remaining: 5000, resetAt: "" };
    expect(await loadPublicRecapWith(deps, "vercel", "c")).toEqual({
      kind: "organization",
      login: "Vercel",
    });
    expect(calls.year).toBe(0);
  });

  test("a hidden account is never fetched", async () => {
    hidden = true;
    expect(await loadPublicRecapWith(deps, "octo", "c")).toEqual({ kind: "hidden", login: "Octo" });
    expect(calls.year).toBe(0);
  });

  test("a first fetch builds a public UTC recap, keeps last year and logs one lookup", async () => {
    const result = await loadPublicRecapWith(deps, "octo", "client-a");
    if (result.kind !== "recap") throw new Error(`expected a recap, got ${result.kind}`);
    expect(result.login).toBe("Octo");
    expect(result.data.meta.scope).toBe("public");
    expect(result.data.meta.timezone).toBe("UTC");
    expect(row?.previous).toEqual(previousYear("2025-11-11"));
    expect(row?.fetchingSince).toBeNull();
    expect(recorded).toEqual(["client-a"]);
    expect(calls).toEqual({ year: 1, previous: 1 });
  });

  test("a fresh stored recap is served without fetching or counting", async () => {
    await seed();
    clock += 11 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls.year).toBe(0);
    expect(recorded).toEqual([]);
  });

  test("a stale recap is fetched again; last year is kept while its span is current", async () => {
    clock = Date.parse("2026-11-11T00:30:00Z");
    await seed();
    clock += 13 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls).toEqual({ year: 1, previous: 0 });
  });

  test("during the year, a lagging last year is fetched again up to today's span end", async () => {
    await seed();
    clock += 13 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls).toEqual({ year: 1, previous: 1 });
    expect(row?.previous?.span.through).toBe("2025-11-12");
  });

  test("once the year is over, a lagging last year is never fetched again", async () => {
    await seed();
    clock = Date.parse("2027-01-05T00:00:00Z");
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls).toEqual({ year: 1, previous: 0 });
    expect(row?.previous?.span.through).toBe("2025-11-11");
  });

  test("a failed refetch of last year keeps the stored one", async () => {
    await seed();
    clock += 13 * HOUR;
    failPrevious = true;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(row?.previous?.span.through).toBe("2025-11-11");
  });

  test("over the client limit: limited when nothing is stored, the old recap when it is", async () => {
    lookups = 20;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("limited");
    lookups = 0;
    await seed();
    clock += 13 * HOUR;
    lookups = 20;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    expect(calls.year).toBe(0);
  });

  test("under the quota floor: busy when nothing is stored", async () => {
    account = { kind: "user", id: ID, login: "Octo", remaining: 299, resetAt: "" };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(calls.year).toBe(0);
    expect(recorded).toEqual([]);
  });

  test("a failed fetch stores nothing, releases the claim and says error", async () => {
    failYear = true;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("error");
    expect(row?.data).toBeNull();
    expect(row?.fetchingSince).toBeNull();
  });

  test("while another request fetches, waits for its recap instead of fetching", async () => {
    othersClaim = true;
    row = {
      login: "Octo",
      data: null,
      schemaVersion: null,
      previous: null,
      fetchedAt: null,
      fetchingSince: new Date(clock),
    };
    let polls = 0;
    onSleep = () => {
      if (++polls === 3) {
        othersClaim = false;
        void store.save(ID, {
          login: "Octo",
          data: { meta: { scope: "public" } } as never,
          previous: null,
        });
      }
    };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    expect(polls).toBe(3);
    expect(calls.year).toBe(0);
    expect(recorded).toEqual([]);
  });

  test("gives up after 60 seconds of waiting and says busy", async () => {
    othersClaim = true;
    row = {
      login: "Octo",
      data: null,
      schemaVersion: null,
      previous: null,
      fetchedAt: null,
      fetchingSince: new Date(clock),
    };
    const start = clock;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(clock - start).toBe(60_000);
    expect(calls.year).toBe(0);
  });
});
