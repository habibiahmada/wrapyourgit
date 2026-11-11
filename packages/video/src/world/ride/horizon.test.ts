import { expect, test } from "bun:test";
import { emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity } from "../city";
import { bearingX, horizonY, skyline } from "./horizon";
import type { RideCamera } from "./project";

const f = { width: 1920, height: 1080 };
const level: RideCamera = { pos: [0, 0, 2], look: [10, 0, 2], fov: 50 };

test("the horizon is at mid-height for a level camera and above the frame when it looks down", () => {
  expect(horizonY(level, f)).toBeCloseTo(f.height / 2);
  expect(horizonY({ pos: [0, 0, 12], look: [10, 0, 0], fov: 25 }, f)).toBeLessThan(0);
});

test("looking up drops the horizon", () => {
  expect(horizonY({ pos: [0, 0, 2], look: [10, 0, 4], fov: 50 }, f)).toBeGreaterThan(f.height / 2);
});

test("a bearing straight ahead is in the centre, one behind is not drawn", () => {
  expect(bearingX(0, level, f)).toBeCloseTo(f.width / 2);
  expect(bearingX(Math.PI, level, f)).toBeNull();
});

test("a bearing to the left of the view is left of centre", () => {
  expect(bearingX(0.3, level, f) ?? 1e9).toBeLessThan(f.width / 2);
  expect(bearingX(0.3 + Math.PI * 2, level, f)).toBeCloseTo(bearingX(0.3, level, f) ?? 0);
});

test("the skyline has 120 towers, taller where a week had more", () => {
  const towers = skyline(buildCity(sampleRecap));
  expect(towers).toHaveLength(120);
  const heights = towers.map((t) => t.height);
  expect(Math.max(...heights)).toBeCloseTo(0.082);
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(0.012);
});

test("an empty year still has a skyline, all at the lowest height", () => {
  for (const tower of skyline(buildCity(emptyRecap))) expect(tower.height).toBeCloseTo(0.012);
});
