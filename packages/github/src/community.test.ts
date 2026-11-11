import { afterEach, describe, expect, test } from "bun:test";
import { GitHubApiError, paginate } from "./client";
import { fetchForkWalks, fetchStarDays, fetchStarHistories } from "./community";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Unix seconds of a UTC date, the shape of the `week` field. */
const unix = (iso: string) => Date.parse(iso) / 1000;

function week(sundayIso: string, days: number[]) {
  return { week: unix(sundayIso), total: days.reduce((a, b) => a + b, 0), days };
}

describe("fetchStarDays", () => {
  test("turns weekly buckets into dated counts and stops once a page reaches the period start", async () => {
    const urls: string[] = [];
    const pages = [
      // 30 weeks, newest first; only the first two carry stars.
      [
        week("2026-11-08T00:00:00Z", [5, 1, 0, 0, 0, 0, 0]),
        week("2026-11-01T00:00:00Z", [0, 0, 2, 0, 0, 0, 0]),
        ...Array.from({ length: 28 }, (_, i) =>
          week(
            new Date(Date.UTC(2026, 9, 25) - i * 7 * 86_400_000).toISOString(),
            [0, 0, 0, 0, 0, 0, 0],
          ),
        ),
      ],
      [
        week("2026-01-04T00:00:00Z", [0, 1, 0, 0, 0, 0, 0]),
        week("2025-12-28T00:00:00Z", [9, 0, 0, 0, 3, 0, 0]),
      ],
      [week("2025-01-05T00:00:00Z", [7, 0, 0, 0, 0, 0, 0])],
    ];
    globalThis.fetch = (async (url: unknown) => {
      urls.push(String(url));
      const page = Number(new URL(String(url)).searchParams.get("page"));
      return Response.json(pages[page - 1] ?? []);
    }) as unknown as typeof fetch;

    const result = await fetchStarDays("t", "octo/app", "2026-01-01T00:00:00.000Z");

    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe(
      "https://api.github.com/repos/octo/app/stargazers/history?per_page=30&page=1",
    );
    expect(result).toEqual({
      nameWithOwner: "octo/app",
      complete: true,
      days: [
        { date: "2026-11-08", count: 5 },
        { date: "2026-11-09", count: 1 },
        { date: "2026-11-03", count: 2 },
        { date: "2026-01-05", count: 1 },
        { date: "2025-12-28", count: 9 },
        { date: "2026-01-01", count: 3 },
      ],
    });
  });

  test("a short page is the repository's first week, so the walk ends there", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return Response.json([week("2026-06-07T00:00:00Z", [1, 0, 0, 0, 0, 0, 0])]);
    }) as unknown as typeof fetch;
    const result = await fetchStarDays("t", "octo/new", "2026-01-01T00:00:00.000Z");
    expect(calls).toBe(1);
    expect(result?.days).toEqual([{ date: "2026-06-07", count: 1 }]);
  });

  test("a repository the token may not read gives null, not zero", async () => {
    for (const status of [401, 403, 404]) {
      globalThis.fetch = (async () =>
        Response.json({ message: "no" }, { status })) as unknown as typeof fetch;
      expect(await fetchStarDays("t", "octo/secret", "2026-01-01T00:00:00.000Z")).toBeNull();
    }
  });

  test("a rate limit is thrown, so callers can answer busy", async () => {
    globalThis.fetch = (async () =>
      Response.json(
        { message: "API rate limit exceeded" },
        { status: 403, headers: { "x-ratelimit-remaining": "0" } },
      )) as unknown as typeof fetch;
    await expect(fetchStarDays("t", "octo/app", "2026-01-01T00:00:00.000Z")).rejects.toBeInstanceOf(
      GitHubApiError,
    );
  });

  test("a server error is thrown", async () => {
    globalThis.fetch = (async () =>
      new Response("oops", { status: 500 })) as unknown as typeof fetch;
    await expect(fetchStarDays("t", "octo/app", "2026-01-01T00:00:00.000Z")).rejects.toBeInstanceOf(
      GitHubApiError,
    );
  });
});

describe("fetchStarHistories", () => {
  test("one unreadable repo makes the whole gain unavailable", async () => {
    globalThis.fetch = (async (url: unknown) =>
      String(url).includes("/secret/")
        ? Response.json({ message: "Not Found" }, { status: 404 })
        : Response.json([])) as unknown as typeof fetch;
    expect(
      await fetchStarHistories("t", ["o/open", "o/secret"], "2026-01-01T00:00:00.000Z"),
    ).toBeNull();
  });

  test("all readable: one entry per repo, in order", async () => {
    globalThis.fetch = (async () =>
      Response.json([
        week("2026-03-01T00:00:00Z", [2, 0, 0, 0, 0, 0, 0]),
      ])) as unknown as typeof fetch;
    const result = await fetchStarHistories("t", ["o/a", "o/b"], "2026-01-01T00:00:00.000Z");
    expect(result?.map((r) => r.nameWithOwner)).toEqual(["o/a", "o/b"]);
    expect(result?.[1]?.days).toEqual([{ date: "2026-03-01", count: 2 }]);
  });
});

describe("fetchStarHistories limits", () => {
  const oneWeek = () => Response.json([week("2026-03-01T00:00:00Z", [1, 0, 0, 0, 0, 0, 0])]);

  test("one shared budget: repos it does not reach come back empty and incomplete", async () => {
    let clock = 0;
    globalThis.fetch = (async () => {
      clock += 10;
      return oneWeek();
    }) as unknown as typeof fetch;
    const result = await fetchStarHistories(
      "t",
      ["o/a", "o/b", "o/c", "o/d"],
      "2026-01-01T00:00:00.000Z",
      { concurrency: 1, budgetMs: 25, now: () => clock },
    );
    expect(result?.map((r) => [r.nameWithOwner, r.days.length, r.complete])).toEqual([
      ["o/a", 1, true],
      ["o/b", 1, true],
      ["o/c", 1, true],
      ["o/d", 0, false],
    ]);
  });

  test("a server error on one repo leaves that repo incomplete, not the recap failed", async () => {
    globalThis.fetch = (async (url: unknown) =>
      String(url).includes("/flaky/")
        ? new Response("bad gateway", { status: 502 })
        : oneWeek()) as unknown as typeof fetch;
    const result = await fetchStarHistories("t", ["o/flaky", "o/ok"], "2026-01-01T00:00:00.000Z");
    expect(result?.map((r) => [r.nameWithOwner, r.days.length, r.complete])).toEqual([
      ["o/flaky", 0, false],
      ["o/ok", 1, true],
    ]);
  });

  test("a spent rate limit makes the gain unavailable instead of failing the recap", async () => {
    globalThis.fetch = (async () =>
      Response.json(
        { message: "API rate limit exceeded" },
        { status: 403, headers: { "x-ratelimit-remaining": "0" } },
      )) as unknown as typeof fetch;
    expect(await fetchStarHistories("t", ["o/a"], "2026-01-01T00:00:00.000Z")).toBeNull();
  });
});

describe("paginate with a deadline", () => {
  test("stops before the next page once the deadline passed, and reports it incomplete", async () => {
    let clock = 0;
    let pages = 0;
    const result = await paginate(
      async () => {
        pages++;
        clock += 10;
        return { items: [pages], pageInfo: { hasNextPage: true, endCursor: String(pages) } };
      },
      { deadline: 25, now: () => clock },
    );
    expect(pages).toBe(3);
    expect(result).toEqual({ items: [1, 2, 3], complete: false });
  });

  test("a deadline already gone fetches nothing", async () => {
    let pages = 0;
    const result = await paginate(
      async () => {
        pages++;
        return { items: [1], pageInfo: { hasNextPage: false, endCursor: null } };
      },
      { deadline: 5, now: () => 10 },
    );
    expect(pages).toBe(0);
    expect(result).toEqual({ items: [], complete: false });
  });
});

describe("fetchForkWalks", () => {
  type Forks = { nodes: { createdAt: string }[]; hasNextPage: boolean };

  function forksApi(byRepo: Record<string, Forks[]>, onRequest?: (name: string) => Promise<void>) {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      const { variables } = JSON.parse(String(init?.body)) as {
        variables: { owner: string; name: string; after: string | null };
      };
      const name = `${variables.owner}/${variables.name}`;
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await (onRequest?.(name) ?? Promise.resolve());
      inFlight--;
      const index = variables.after ? Number(variables.after) : 0;
      const page = byRepo[name]?.[index] ?? { nodes: [], hasNextPage: false };
      return Response.json({
        data: {
          repository: {
            forks: {
              nodes: page.nodes,
              pageInfo: { hasNextPage: page.hasNextPage, endCursor: String(index + 1) },
            },
          },
        },
      });
    }) as unknown as typeof fetch;
    return { fetchImpl, maxInFlight: () => maxInFlight };
  }

  const fork = (createdAt: string) => ({ createdAt });

  test("walks repos concurrently, at most `concurrency` at once, and keeps repo order", async () => {
    const api = forksApi(
      {
        "o/a": [
          {
            nodes: [fork("2026-05-01T00:00:00Z"), fork("2025-12-01T00:00:00Z")],
            hasNextPage: true,
          },
        ],
        "o/b": [{ nodes: [fork("2026-03-01T00:00:00Z")], hasNextPage: false }],
        "o/c": [{ nodes: [], hasNextPage: false }],
      },
      () => new Promise((resolve) => setTimeout(resolve, 5)),
    );
    globalThis.fetch = api.fetchImpl;
    const walks = await fetchForkWalks("t", ["o/a", "o/b", "o/c"], "2026-01-01T00:00:00.000Z", {
      concurrency: 2,
    });
    expect(api.maxInFlight()).toBe(2);
    expect(walks).toEqual([
      // The page reached back before the period, so the walk is complete without page two.
      {
        nameWithOwner: "o/a",
        createdAt: ["2026-05-01T00:00:00Z", "2025-12-01T00:00:00Z"],
        complete: true,
      },
      { nameWithOwner: "o/b", createdAt: ["2026-03-01T00:00:00Z"], complete: true },
      { nameWithOwner: "o/c", createdAt: [], complete: true },
    ]);
  });

  test("a server error on one repo leaves that walk incomplete, the others intact", async () => {
    const ok = forksApi({ "o/b": [{ nodes: [fork("2026-02-01T00:00:00Z")], hasNextPage: false }] });
    globalThis.fetch = (async (url: unknown, init?: RequestInit) =>
      String(init?.body).includes('"name":"a"')
        ? new Response("bad gateway", { status: 502 })
        : ok.fetchImpl(url as string, init)) as unknown as typeof fetch;
    const walks = await fetchForkWalks("t", ["o/a", "o/b"], "2026-01-01T00:00:00.000Z");
    expect(walks).toEqual([
      { nameWithOwner: "o/a", createdAt: [], complete: false },
      { nameWithOwner: "o/b", createdAt: ["2026-02-01T00:00:00Z"], complete: true },
    ]);
  });

  test("the page cap leaves a walk incomplete", async () => {
    globalThis.fetch = forksApi({
      "o/a": [
        { nodes: [fork("2026-09-01T00:00:00Z")], hasNextPage: true },
        { nodes: [fork("2026-08-01T00:00:00Z")], hasNextPage: true },
      ],
    }).fetchImpl;
    const [walk] = await fetchForkWalks("t", ["o/a"], "2026-01-01T00:00:00.000Z", { maxPages: 1 });
    expect(walk).toEqual({
      nameWithOwner: "o/a",
      createdAt: ["2026-09-01T00:00:00Z"],
      complete: false,
    });
  });

  test("one shared budget: past it, walks stop and the rest start empty and incomplete", async () => {
    let clock = 0;
    const api = forksApi(
      {
        "o/a": Array.from({ length: 5 }, () => ({
          nodes: [fork("2026-09-01T00:00:00Z")],
          hasNextPage: true,
        })),
        "o/b": [{ nodes: [fork("2026-02-01T00:00:00Z")], hasNextPage: false }],
      },
      async () => {
        clock += 10;
      },
    );
    globalThis.fetch = api.fetchImpl;
    const walks = await fetchForkWalks("t", ["o/a", "o/b"], "2026-01-01T00:00:00.000Z", {
      concurrency: 1,
      budgetMs: 25,
      now: () => clock,
    });
    expect(walks).toEqual([
      {
        nameWithOwner: "o/a",
        createdAt: ["2026-09-01T00:00:00Z", "2026-09-01T00:00:00Z", "2026-09-01T00:00:00Z"],
        complete: false,
      },
      { nameWithOwner: "o/b", createdAt: [], complete: false },
    ]);
  });
});
