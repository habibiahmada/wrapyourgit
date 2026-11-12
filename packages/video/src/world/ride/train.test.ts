import { expect, test } from "bun:test";
import type { Box, Solid } from "./prims";
import { at, heading } from "./track";
import { smoke, train } from "./train";

const tagged = (solids: Solid[], tag: string) =>
  solids.filter((s): s is Box => s.kind === "box" && s.tag === tag);

test("the train has an engine and two wagons", () => {
  const parts = train(40);
  expect(tagged(parts, "engine").length).toBeGreaterThan(0);
  expect(tagged(parts, "wagon")).toHaveLength(2);
  // Wheels are painted on the bodies, never boxes of their own.
  expect(tagged(parts, "wheel")).toHaveLength(0);
});

test("the engine's nose is where the train is", () => {
  const [x, y] = at(40);
  for (const p of tagged(train(40), "engine")) expect(p.pivot).toEqual([x, y]);
});

test("each wagon follows its own piece of rail", () => {
  // At s = 20 the rail is bending, so a wagon a few units back points a slightly different way.
  const wagons = tagged(train(20), "wagon");
  const engine = tagged(train(20), "engine")[0];
  expect(wagons[0]?.yaw).toBeCloseTo(heading(20 - 2.8));
  expect(wagons[1]?.yaw).toBeCloseTo(heading(20 - 4.3));
  expect(wagons[0]?.yaw).not.toBeCloseTo(engine?.yaw ?? 0, 3);
});

test("every wheel is the same size, painted on both sides of its body: three axles on the engine, two on a wagon", () => {
  const parts = train(40);
  const wheels = (box: Box | undefined) => {
    if (!box) throw new Error("no body");
    // A wheel is its tyre, its rim and its hub: the tyre is the widest round decal.
    const tyres = (box.decals ?? []).filter((d) => d.round && d.fill === "#0d1117");
    const widths = tyres.map((d) => (d.rect[2] - d.rect[0]) * box.size[0]);
    const tall = tyres.map((d) => (d.rect[3] - d.rect[1]) * box.size[2]);
    expect(tyres.every((d) => d.on === "sides")).toBe(true);
    return { count: tyres.length / 2, size: Math.max(...widths), height: Math.max(...tall) };
  };
  const engine = wheels(tagged(parts, "frame")[0]);
  const wagons = tagged(parts, "wagon").map(wheels);
  expect(engine.count).toBe(3);
  for (const wagon of wagons) {
    expect(wagon.count).toBe(2);
    expect(wagon.size).toBeCloseTo(engine.size);
    expect(wagon.height).toBeCloseTo(engine.height);
  }
  // Round on screen: as wide as it is tall.
  expect(engine.size).toBeCloseTo(engine.height);
});

test("smoke repeats every five frames while the train rests", () => {
  expect(smoke(100, 30, 0)).toEqual(smoke(105, 30, 0));
  expect(smoke(100, 30, 0).length).toBeGreaterThan(3);
});

test("smoke streams back along the rail while the train moves, and stands over the chimney at rest", () => {
  const xs = (speed: number) => smoke(100, 30, speed).map((s) => (s.kind === "ball" ? s.c[0] : 0));
  expect(new Set(xs(0).map((x) => x.toFixed(6))).size).toBe(1);
  expect(Math.min(...xs(0.4))).toBeLessThan(Math.min(...xs(0)) - 1);
});

test("smoke rises and fades", () => {
  const puffs = smoke(100, 30, 0).filter((s) => s.kind === "ball");
  const sorted = [...puffs].sort((a, b) =>
    a.kind === "ball" && b.kind === "ball" ? a.c[2] - b.c[2] : 0,
  );
  const low = sorted[0];
  const high = sorted.at(-1);
  if (low?.kind !== "ball" || high?.kind !== "ball") throw new Error("no puffs");
  expect(high.opacity ?? 1).toBeLessThan(low.opacity ?? 1);
});
