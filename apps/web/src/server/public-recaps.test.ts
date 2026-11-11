import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
  type AccountLookup,
  GitHubApiError,
  type PreviousYearActivity,
  type YearActivity,
} from "@wyg/github";
import { SCHEMA_VERSION } from "@wyg/schema";
import { drizzle } from "drizzle-orm/postgres-js";

// public-recaps.ts is server-only; the guard throws outside a React server bundle.
mock.module("server-only", () => ({}));
const { loadPublicRecapWith, setPublicRecapHidden, staleLookups } = await import("./public-recaps");
type Deps = Parameters<typeof loadPublicRecapWith>[0];
type Store = Deps["store"];
type Row = NonNullable<Awaited<ReturnType<Store["read"]>>>;

const ID = 42;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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
let calls: { lookup: number; year: number; previous: number };
let failYear: boolean;
let failPrevious: boolean;
let failRecord: boolean;
let githubError: { lookup?: Error; year?: Error };
let duringFetch: (() => void) | null;
let onClaimRefused: (() => void) | null;
let onSleep: (() => void) | null;

const store: Store = {
  isHidden: async () => hidden,
  read: async () => (row ? { ...row } : null),
  readByLogin: async (login) =>
    row && row.login.toLowerCase() === login.toLowerCase() ? { ...row, githubId: ID } : null,
  countLookups: async () => lookups,
  recordLookup: async (client) => {
    if (failRecord) throw new Error("db down");
    recorded.push(client);
  },
  claim: async (_id, login) => {
    if (othersClaim) {
      onClaimRefused?.();
      return null;
    }
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
  save: async (_id, claimedAt, saved) => {
    if (row?.fetchingSince?.getTime() !== claimedAt.getTime()) return;
    row = {
      ...saved,
      schemaVersion: SCHEMA_VERSION,
      fetchedAt: new Date(clock),
      fetchingSince: null,
    };
  },
  release: async (_id, claimedAt) => {
    if (row && row.fetchingSince?.getTime() === claimedAt.getTime()) {
      row = { ...row, fetchingSince: null };
    }
  },
};

const deps: Deps = {
  lookup: async () => {
    calls.lookup++;
    if (githubError.lookup) throw githubError.lookup;
    return account;
  },
  fetchYear: async (login) => {
    calls.year++;
    duringFetch?.();
    if (failYear) throw new Error("boom");
    if (githubError.year) throw githubError.year;
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
  calls = { lookup: 0, year: 0, previous: 0 };
}

beforeEach(() => {
  clock = Date.parse("2026-11-11T12:00:00Z");
  row = null;
  hidden = false;
  lookups = 0;
  recorded = [];
  othersClaim = false;
  account = { kind: "user", id: ID, login: "Octo", remaining: 5000, resetAt: "" };
  calls = { lookup: 0, year: 0, previous: 0 };
  failYear = false;
  failPrevious = false;
  failRecord = false;
  githubError = {};
  duringFetch = null;
  onClaimRefused = null;
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
    expect(calls).toEqual({ lookup: 1, year: 1, previous: 1 });
  });

  test("a fresh stored recap is served by login without asking GitHub at all", async () => {
    await seed();
    clock += 11 * HOUR;
    account = { kind: "missing", remaining: 0, resetAt: "" };
    expect(await loadPublicRecapWith(deps, "OCTO", "client-b")).toMatchObject({
      kind: "recap",
      login: "Octo",
    });
    expect(calls).toEqual({ lookup: 0, year: 0, previous: 0 });
    expect(recorded).toEqual([]);
  });

  test("a fresh stored recap of a hidden account is hidden, by its stored id", async () => {
    await seed();
    hidden = true;
    expect(await loadPublicRecapWith(deps, "octo", "c")).toEqual({ kind: "hidden", login: "Octo" });
    expect(calls).toEqual({ lookup: 0, year: 0, previous: 0 });
  });

  test("a stale stored recap asks GitHub who the login is first", async () => {
    await seed();
    clock += 13 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    expect(calls).toEqual({ lookup: 1, year: 1, previous: 1 });
  });

  test("a stale recap is fetched again; last year is kept while its span is current", async () => {
    clock = Date.parse("2026-11-11T00:30:00Z");
    await seed();
    clock += 13 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls).toEqual({ lookup: 1, year: 1, previous: 0 });
  });

  test("during the year, a lagging last year is fetched again up to today's span end", async () => {
    await seed();
    clock += 13 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls).toEqual({ lookup: 1, year: 1, previous: 1 });
    expect(row?.previous?.span.through).toBe("2025-11-12");
  });

  test("after the year, a mid-year span is refetched once, then kept at 31 December", async () => {
    await seed();
    clock = Date.parse("2027-01-05T00:00:00Z");
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls).toEqual({ lookup: 1, year: 1, previous: 1 });
    expect(row?.previous?.span.through).toBe("2025-12-31");

    clock += 13 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(calls).toEqual({ lookup: 2, year: 2, previous: 1 });
    expect(row?.previous?.span.through).toBe("2025-12-31");
  });

  test("a failed refetch of last year keeps the stored one", async () => {
    await seed();
    clock += 13 * HOUR;
    failPrevious = true;
    expect((await loadPublicRecapWith(deps, "octo", "client-b")).kind).toBe("recap");
    expect(row?.previous?.span.through).toBe("2025-11-11");
  });

  test("a client at the limit gets limited without GitHub being asked", async () => {
    lookups = 20;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("limited");
    expect(calls).toEqual({ lookup: 0, year: 0, previous: 0 });
    expect(recorded).toEqual([]);
  });

  test("at the limit, a stale stored recap still plays, without a lookup", async () => {
    await seed();
    clock += 13 * HOUR;
    lookups = 20;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    expect(calls).toEqual({ lookup: 0, year: 0, previous: 0 });
    hidden = true;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("hidden");
  });

  test("at the limit, a recap older than the stale cap is not served: limited", async () => {
    await seed();
    clock += 8 * DAY;
    lookups = 20;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("limited");
    expect(calls).toEqual({ lookup: 0, year: 0, previous: 0 });
  });

  test("a lookup that ends without a fetch is still counted", async () => {
    account = { kind: "missing", remaining: 5000, resetAt: "" };
    expect((await loadPublicRecapWith(deps, "nobody", "client-a")).kind).toBe("missing");
    expect(recorded).toEqual(["client-a"]);
  });

  test("a fetch is counted once, with its lookup", async () => {
    await loadPublicRecapWith(deps, "octo", "client-a");
    expect(recorded).toEqual(["client-a"]);
  });

  test("a failure to count leaves no claim behind and asks GitHub nothing", async () => {
    await seed();
    clock += 13 * HOUR;
    failRecord = true;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("error");
    expect(row?.fetchingSince).toBeNull();
    expect(calls).toEqual({ lookup: 0, year: 0, previous: 0 });
  });

  test("under the quota floor: busy when nothing is stored", async () => {
    account = { kind: "user", id: ID, login: "Octo", remaining: 299, resetAt: "" };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(calls.year).toBe(0);
    expect(recorded).toEqual(["c"]);
  });

  test("under the quota floor: a stale recap within the cap plays, an older one is busy", async () => {
    await seed();
    account = { kind: "user", id: ID, login: "Octo", remaining: 299, resetAt: "" };
    clock += 13 * HOUR;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    clock += 8 * DAY;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(calls.year).toBe(0);
  });

  test("GitHub out of quota on the lookup says busy, not error", async () => {
    githubError.lookup = new GitHubApiError("limit", 200, [{ type: "RATE_LIMITED" }]);
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
  });

  test("GitHub out of quota on the fetch: busy, or the stored recap, and the claim released", async () => {
    githubError.year = new GitHubApiError("limit", 403);
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(row?.fetchingSince).toBeNull();
    githubError = {};
    await seed();
    clock += 13 * HOUR;
    githubError.year = new GitHubApiError("limit", 429);
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    expect(row?.fetchingSince).toBeNull();
  });

  test("GitHub out of quota on the fetch: a recap older than the stale cap is busy", async () => {
    await seed();
    clock += 8 * DAY;
    githubError.year = new GitHubApiError("limit", 429);
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(row?.fetchingSince).toBeNull();
  });

  test("a failed fetch stores nothing, releases the claim and says error", async () => {
    failYear = true;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("error");
    expect(row?.data).toBeNull();
    expect(row?.fetchingSince).toBeNull();
  });

  test("while another request fetches, waits for its recap instead of fetching", async () => {
    othersClaim = true;
    const holderClaim = new Date(clock);
    row = {
      login: "Octo",
      data: null,
      schemaVersion: null,
      previous: null,
      fetchedAt: null,
      fetchingSince: holderClaim,
    };
    let polls = 0;
    onSleep = () => {
      if (++polls === 3) {
        othersClaim = false;
        void store.save(ID, holderClaim, {
          login: "Octo",
          data: { meta: { scope: "public" } } as never,
          previous: null,
        });
      }
    };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    expect(polls).toBe(3);
    expect(calls.year).toBe(0);
    expect(recorded).toEqual(["c"]);
  });

  test("a fetch that finished just before the wait began is served at once", async () => {
    await seed();
    clock += 13 * HOUR;
    othersClaim = true;
    // The other request saves between this request's refused claim and its first read.
    const fresh = { ...row?.data } as NonNullable<Row["data"]>;
    onClaimRefused = () => {
      if (row) row = { ...row, data: fresh, fetchedAt: new Date(clock), fetchingSince: null };
    };
    let polls = 0;
    onSleep = () => {
      polls++;
    };
    const result = await loadPublicRecapWith(deps, "octo", "c");
    // The new recap, not the stale one this request read before its claim.
    expect(result.kind === "recap" && result.data).toBe(fresh);
    expect(polls).toBe(0);
    expect(calls.year).toBe(0);
  });

  test("stops waiting once the other holder's claim has gone stale", async () => {
    othersClaim = true;
    row = {
      login: "Octo",
      data: null,
      schemaVersion: null,
      previous: null,
      fetchedAt: null,
      fetchingSince: new Date(clock - 119_000),
    };
    const start = clock;
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(clock - start).toBe(2_000);
  });

  test("a holder whose claim was taken over neither stores nor releases", async () => {
    const takeover = new Date(clock + 1);
    duringFetch = () => {
      if (row) row = { ...row, fetchingSince: takeover };
    };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");
    expect(row?.data).toBeNull();
    expect(row?.fetchingSince).toEqual(takeover);

    failYear = true;
    row = row && { ...row, fetchingSince: null };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("error");
    expect(row?.fetchingSince).toEqual(takeover);
  });

  test("an owner who hides during the fetch: nothing is stored and the visitor sees hidden", async () => {
    duringFetch = () => {
      hidden = true;
    };
    expect(await loadPublicRecapWith(deps, "octo", "c")).toEqual({ kind: "hidden", login: "Octo" });
    expect(row?.data).toBeNull();
    expect(row?.fetchingSince).toBeNull();
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

  test("after a wait that times out, only a recap within the stale cap stands in", async () => {
    await seed();
    clock += 13 * HOUR;
    othersClaim = true;
    if (row) row = { ...row, fetchingSince: new Date(clock) };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("recap");

    clock += 8 * DAY;
    if (row) row = { ...row, fetchingSince: new Date(clock) };
    expect((await loadPublicRecapWith(deps, "octo", "c")).kind).toBe("busy");
    expect(calls.year).toBe(0);
  });
});

describe("staleLookups", () => {
  test("deletes every client's rows older than the window, not only the caller's", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    const query = staleLookups(drizzle.mock(), now).toSQL();
    // No client condition: a visitor who never comes back loses their rows too.
    expect(query.sql).toBe('delete from "public_lookups" where "public_lookups"."at" < $1');
    expect(query.params).toEqual([new Date(now.getTime() - HOUR).toISOString()]);
  });
});

describe("setPublicRecapHidden", () => {
  const log: string[] = [];
  const hideStore = {
    setHidden: async (id: number, value: boolean) => {
      log.push(`hidden ${id} ${value}`);
    },
    forget: async (id: number) => {
      log.push(`forget ${id}`);
    },
  };

  test("hiding marks the account hidden and forgets the stored recap", async () => {
    log.length = 0;
    await setPublicRecapHidden(7, true, hideStore);
    expect(log).toEqual(["hidden 7 true", "forget 7"]);
  });

  test("showing it again only clears the mark", async () => {
    log.length = 0;
    await setPublicRecapHidden(7, false, hideStore);
    expect(log).toEqual(["hidden 7 false"]);
  });
});
