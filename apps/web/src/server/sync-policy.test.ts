import { describe, expect, test } from "bun:test";
import {
  canPublish,
  nextSyncAt,
  PUBLISH_MAX_AGE_MS,
  SYNC_COOLDOWN_MS,
  safeTimezone,
  yearRange,
} from "./sync-policy";

const now = new Date("2026-11-04T10:00:00Z");

describe("nextSyncAt", () => {
  test("first sync is always allowed", () => {
    expect(nextSyncAt(null, now)).toBeNull();
  });

  test("blocked inside the cooldown, allowed after it", () => {
    const recent = new Date(now.getTime() - 60_000);
    expect(nextSyncAt(recent, now)).toEqual(new Date(recent.getTime() + SYNC_COOLDOWN_MS));
    expect(nextSyncAt(new Date(now.getTime() - SYNC_COOLDOWN_MS), now)).toBeNull();
  });
});

describe("safeTimezone", () => {
  test("keeps valid IANA zones and rejects junk", () => {
    expect(safeTimezone("Asia/Jakarta")).toBe("Asia/Jakarta");
    expect(safeTimezone("Not/AZone")).toBe("UTC");
    expect(safeTimezone(42)).toBe("UTC");
    expect(safeTimezone("x".repeat(100))).toBe("UTC");
  });
});

describe("yearRange", () => {
  test("covers Jan 1 to Dec 31 23:59:59 UTC", () => {
    const { from, to } = yearRange(2026);
    expect(from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-31T23:59:59.000Z");
  });
});

describe("canPublish", () => {
  test("needs a sync within the last 24 hours", () => {
    expect(canPublish(null, now)).toBe(false);
    expect(canPublish(new Date(now.getTime() - PUBLISH_MAX_AGE_MS), now)).toBe(true);
    expect(canPublish(new Date(now.getTime() - PUBLISH_MAX_AGE_MS - 1), now)).toBe(false);
  });
});
