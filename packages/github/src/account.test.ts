import { afterEach, describe, expect, test } from "bun:test";
import { lookupAccount, toAccountLookup } from "./account";

const rateLimit = { remaining: 4321, resetAt: "2026-11-11T12:00:00Z" };

describe("toAccountLookup", () => {
  test("maps a user with its numeric id", () => {
    expect(
      toAccountLookup({
        repositoryOwner: { __typename: "User", login: "octo", databaseId: 7 },
        rateLimit,
      }),
    ).toEqual({ kind: "user", id: 7, login: "octo", ...rateLimit });
  });

  test("maps an organisation", () => {
    expect(
      toAccountLookup({
        repositoryOwner: { __typename: "Organization", login: "acme" },
        rateLimit,
      }),
    ).toEqual({ kind: "organization", login: "acme", ...rateLimit });
  });

  test("a null owner is missing", () => {
    expect(toAccountLookup({ repositoryOwner: null, rateLimit })).toEqual({
      kind: "missing",
      ...rateLimit,
    });
  });
});

describe("lookupAccount", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("sends the login as a variable and maps the response", async () => {
    let sent: { variables: unknown } | undefined;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return Response.json({
        data: { repositoryOwner: { __typename: "User", login: "octo", databaseId: 7 }, rateLimit },
      });
    }) as unknown as typeof fetch;
    const result = await lookupAccount("test-token", "octo");
    expect(sent?.variables).toEqual({ login: "octo" });
    expect(result).toMatchObject({ kind: "user", id: 7, login: "octo", ...rateLimit });
  });
});

describe("lookupAccount quota", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("adds the REST quota and the token's expiry from /rate_limit", async () => {
    globalThis.fetch = (async (url: unknown) =>
      String(url).endsWith("/rate_limit")
        ? Response.json(
            { resources: { core: { remaining: 4934 } } },
            { headers: { "github-authentication-token-expiration": "2027-02-09 05:34:07 UTC" } },
          )
        : Response.json({
            data: {
              repositoryOwner: { __typename: "User", login: "octo", databaseId: 7 },
              rateLimit,
            },
          })) as unknown as typeof fetch;
    expect(await lookupAccount("test-token", "octo")).toEqual({
      kind: "user",
      id: 7,
      login: "octo",
      ...rateLimit,
      restRemaining: 4934,
      tokenExpiresAt: "2027-02-09 05:34:07 UTC",
    });
  });

  test("a failed /rate_limit leaves both unknown instead of failing the lookup", async () => {
    globalThis.fetch = (async (url: unknown) =>
      String(url).endsWith("/rate_limit")
        ? new Response("oops", { status: 500 })
        : Response.json({ data: { repositoryOwner: null, rateLimit } })) as unknown as typeof fetch;
    expect(await lookupAccount("test-token", "nobody")).toEqual({
      kind: "missing",
      ...rateLimit,
      restRemaining: null,
      tokenExpiresAt: null,
    });
  });
});
