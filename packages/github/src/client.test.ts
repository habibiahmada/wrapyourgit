import { afterEach, describe, expect, test } from "bun:test";
import { GitHubApiError, githubGraphql } from "./client";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("githubGraphql", () => {
  test("a gateway timeout is retried once", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return calls === 1
        ? new Response("timeout", { status: 504 })
        : Response.json({ data: { ok: true } });
    }) as unknown as typeof fetch;
    expect(await githubGraphql("t", "query { ok }", {}, { retryDelayMs: 0 })).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  test("a second gateway failure is thrown with its status", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("bad gateway", { status: 502 });
    }) as unknown as typeof fetch;
    const error = await githubGraphql("t", "query { ok }", {}, { retryDelayMs: 0 }).catch(
      (e: unknown) => e,
    );
    expect(calls).toBe(2);
    expect(error).toBeInstanceOf(GitHubApiError);
    expect((error as GitHubApiError).status).toBe(502);
  });

  test("other failures are not retried", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return Response.json({ message: "Bad credentials" }, { status: 401 });
    }) as unknown as typeof fetch;
    await expect(
      githubGraphql("t", "query { ok }", {}, { retryDelayMs: 0 }),
    ).rejects.toBeInstanceOf(GitHubApiError);
    expect(calls).toBe(1);
  });
});
