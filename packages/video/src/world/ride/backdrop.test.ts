import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity } from "../city";
import { backdrop } from "./backdrop";
import { horizonY } from "./horizon";
import { GROUND, SKY } from "./palette";
import type { RideCamera } from "./project";

const f = { width: 1920, height: 1080 };
const level: RideCamera = { pos: [0, 0, 2], look: [10, 0, 2], fov: 50 };
const city = buildCity(sampleRecap);

const ys = (pts: [number, number][]) => pts.map(([, y]) => y);
const xs = (pts: [number, number][]) => pts.map(([x]) => x);

test("the sky comes first and the ground starts at the horizon", () => {
  const prims = backdrop(level, f, city, 0);
  const sky = prims[0];
  if (sky?.kind !== "poly") throw new Error("the sky is a polygon");
  expect(sky.fill).toBe(SKY);
  const ground = prims.find((p) => p.kind === "poly" && p.fill === GROUND);
  if (ground?.kind !== "poly") throw new Error("the ground is a polygon");
  expect(Math.min(...ys(ground.pts))).toBeCloseTo(horizonY(level, f));
});

test("sky and ground reach far past the frame, so a rolled scene shows no edge", () => {
  for (const fill of [SKY, GROUND]) {
    const p = backdrop(level, f, city, 0).find((q) => q.kind === "poly" && q.fill === fill);
    if (p?.kind !== "poly") throw new Error("missing");
    expect(Math.min(...xs(p.pts))).toBeLessThan(-f.width);
    expect(Math.max(...xs(p.pts))).toBeGreaterThan(f.width * 2);
  }
});

test("nothing is outlined and nothing is see-through: flat colours only", () => {
  for (const p of backdrop(level, f, city, 7)) {
    if (p.kind === "poly") expect(p.stroke).toBeNull();
    if (p.kind === "circle") expect(p.opacity).toBe(1);
    expect(p.kind === "poly" || p.kind === "circle").toBe(true);
  }
});

test("the stars twinkle, and repeat every 60 frames", () => {
  expect(backdrop(level, f, city, 7)).not.toEqual(backdrop(level, f, city, 0));
  expect(backdrop(level, f, city, 67)).toEqual(backdrop(level, f, city, 7));
});

test("the skyline stands on the horizon", () => {
  const towers = backdrop(level, f, city, 0).filter(
    (p) => p.kind === "poly" && (p.fill === "#1b2f25" || p.fill === "#16261e"),
  );
  expect(towers.length).toBeGreaterThan(10);
  for (const t of towers) {
    if (t.kind !== "poly") continue;
    expect(Math.min(...ys(t.pts))).toBeLessThan(horizonY(level, f));
    expect(Math.max(...ys(t.pts))).toBeGreaterThanOrEqual(horizonY(level, f));
  }
});
