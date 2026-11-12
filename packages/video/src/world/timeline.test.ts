import { expect, test } from "bun:test";
import { easeInOutCubic } from "./timeline";

test("easeInOutCubic starts and ends still, and is half way at the middle", () => {
  expect(easeInOutCubic(0)).toBe(0);
  expect(easeInOutCubic(1)).toBe(1);
  expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
  expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
});
