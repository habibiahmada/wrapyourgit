import { describe, expect, test } from "bun:test";
import { slideExportsAvailable } from "./exports";

describe("slideExportsAvailable", () => {
  test("on outside Vercel by default", () => {
    expect(slideExportsAvailable({})).toBe(true);
  });

  test("off on Vercel by default", () => {
    expect(slideExportsAvailable({ VERCEL: "1" })).toBe(false);
  });

  test("SLIDE_EXPORTS overrides the host", () => {
    expect(slideExportsAvailable({ VERCEL: "1", SLIDE_EXPORTS: "on" })).toBe(true);
    expect(slideExportsAvailable({ SLIDE_EXPORTS: "OFF " })).toBe(false);
  });

  test("an unknown value falls back to the host", () => {
    expect(slideExportsAvailable({ SLIDE_EXPORTS: "maybe" })).toBe(true);
    expect(slideExportsAvailable({ VERCEL: "1", SLIDE_EXPORTS: "" })).toBe(false);
  });
});
