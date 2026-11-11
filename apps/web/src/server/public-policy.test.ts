import { describe, expect, test } from "bun:test";
import {
  canStartFetch,
  claimIsStale,
  firstForwardedAddress,
  hashClient,
  isFresh,
  underClientLimit,
} from "./public-policy";

const now = new Date("2026-11-11T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe("isFresh", () => {
  test("a recap fetched 11 h 59 m ago is fresh, 12 h 01 m ago is not", () => {
    expect(isFresh(ago(11 * HOUR + 59 * MINUTE), now)).toBe(true);
    expect(isFresh(ago(12 * HOUR + MINUTE), now)).toBe(false);
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
});
