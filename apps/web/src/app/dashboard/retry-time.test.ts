import { describe, expect, test } from "bun:test";
import { retryTime } from "./retry-time";

const AT = "2026-11-21T16:06:00.000Z";

describe("retryTime", () => {
  test("before the browser's zone is known it is UTC, said out loud, the same on server and client", () => {
    expect(retryTime(AT, null)).toBe("16:06 UTC");
  });

  test("once the zone is known it is the viewer's own time", () => {
    const jakarta = retryTime(AT, "Asia/Jakarta");
    expect(jakarta).toMatch(/11:06|23:06/);
    expect(jakarta).not.toContain("UTC");
  });
});
