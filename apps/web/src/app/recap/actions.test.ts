import { describe, expect, test } from "bun:test";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  test("allows /settings only", () => {
    expect(safeRedirect("/settings")).toBe("/settings");
  });

  test.each(["//evil", "https://x", "/dashboard", "/settings/", "/settings?x=1", ""])(
    "rejects %p",
    (value) => {
      expect(safeRedirect(value)).toBeNull();
    },
  );

  test("rejects a missing field and an uploaded file", () => {
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect(new File([], "a"))).toBeNull();
  });
});
