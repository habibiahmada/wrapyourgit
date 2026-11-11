import { describe, expect, test } from "bun:test";
import { GitHubApiError } from "@wyg/github";
import {
  canServeStale,
  canStartFetch,
  claimIsStale,
  firstForwardedAddress,
  hashClient,
  isFresh,
  isRateLimited,
  lookupSalt,
  previousIsCurrent,
  underClientLimit,
} from "./public-policy";

const now = new Date("2026-11-11T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("isFresh", () => {
  test("a recap fetched 11 h 59 m ago is fresh, 12 h 01 m ago is not", () => {
    expect(isFresh(ago(11 * HOUR + 59 * MINUTE), now)).toBe(true);
    expect(isFresh(ago(12 * HOUR + MINUTE), now)).toBe(false);
  });
});

describe("canServeStale", () => {
  test("a recap fetched 6 days 23 h ago may still stand in, one 7 days 1 h old may not", () => {
    expect(canServeStale(ago(6 * DAY + 23 * HOUR), now)).toBe(true);
    expect(canServeStale(ago(7 * DAY + HOUR), now)).toBe(false);
  });
});

describe("canStartFetch", () => {
  test("starts at 300 points left and stops at 299", () => {
    expect(canStartFetch(300)).toBe(true);
    expect(canStartFetch(299)).toBe(false);
  });
});

describe("underClientLimit", () => {
  test("allows a 20th new username in the hour, not a 21st", () => {
    expect(underClientLimit(19)).toBe(true);
    expect(underClientLimit(20)).toBe(false);
  });
});

describe("claimIsStale", () => {
  test("a claim held for 1 minute is live, for 3 minutes is abandoned", () => {
    expect(claimIsStale(ago(MINUTE), now)).toBe(false);
    expect(claimIsStale(ago(3 * MINUTE), now)).toBe(true);
  });
});

describe("client key", () => {
  test("takes the first x-forwarded-for address, trimmed", () => {
    expect(firstForwardedAddress(" 203.0.113.7 , 10.0.0.1")).toBe("203.0.113.7");
    expect(firstForwardedAddress(null)).toBe("unknown");
    expect(firstForwardedAddress("  ")).toBe("unknown");
  });

  test("hashes the address with the salt and never contains it", () => {
    const key = hashClient("203.0.113.7", "salt-a");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.7");
    expect(hashClient("203.0.113.7", "salt-a")).toBe(key);
    expect(hashClient("203.0.113.7", "salt-b")).not.toBe(key);
    expect(hashClient("203.0.113.8", "salt-a")).not.toBe(key);
  });

  test("the salt is derived from the encryption key under its own label, never the key itself", () => {
    const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const salt = lookupSalt(key);
    expect(salt).toMatch(/^[0-9a-f]{64}$/);
    expect(salt).not.toContain(key);
    expect(lookupSalt(key)).toBe(salt);
    expect(lookupSalt(`${key.slice(0, -1)}0`)).not.toBe(salt);
    // HMAC-SHA256(key, "public-lookups"): a known vector, so the label can't drift silently.
    expect(lookupSalt("k")).toBe(
      "7a84134dd7264363b9e744268a5f8cbda111c45bbac99059646efe06eb595564",
    );
  });
});

describe("previousIsCurrent", () => {
  const nov = new Date("2026-11-11T12:00:00Z");

  test("missing last year is never current", () => {
    expect(previousIsCurrent(null, 2026, nov)).toBe(false);
  });

  test("during the year, a span ending before today's span end is refetched", () => {
    expect(previousIsCurrent("2025-03-01", 2026, nov)).toBe(false);
    expect(previousIsCurrent("2025-11-10", 2026, nov)).toBe(false);
  });

  test("during the year, a span ending today last year is kept", () => {
    expect(previousIsCurrent("2025-11-11", 2026, nov)).toBe(true);
  });

  test("after the year, a mid-year span is refetched, one at 31 December is kept", () => {
    const after = new Date("2027-01-02T00:00:00Z");
    expect(previousIsCurrent("2025-03-01", 2026, after)).toBe(false);
    expect(previousIsCurrent("2025-12-31", 2026, after)).toBe(true);
    expect(previousIsCurrent("2025-12-31", 2026, new Date("2027-06-01T00:00:00Z"))).toBe(true);
  });
});

describe("isRateLimited", () => {
  test("GraphQL's RATE_LIMITED error and the secondary limits (403, 429) count", () => {
    expect(isRateLimited(new GitHubApiError("x", 200, [{ type: "RATE_LIMITED" }]))).toBe(true);
    expect(isRateLimited(new GitHubApiError("x", 403))).toBe(true);
    expect(isRateLimited(new GitHubApiError("x", 429))).toBe(true);
  });

  test("other failures do not", () => {
    expect(isRateLimited(new GitHubApiError("x", 401))).toBe(false);
    expect(isRateLimited(new GitHubApiError("x", 200, [{ type: "NOT_FOUND" }]))).toBe(false);
    expect(isRateLimited(new GitHubApiError("x", 502))).toBe(false);
    expect(isRateLimited(new Error("boom"))).toBe(false);
  });
});
