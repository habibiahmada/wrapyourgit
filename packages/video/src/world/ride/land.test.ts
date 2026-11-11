import { expect, test } from "bun:test";
import { emptyRecap, provisionalRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity, type City } from "../city";
import { gates } from "./gates.model";
import { land, type View } from "./land";
import type { Box, Solid } from "./prims";
import { rideStops } from "./stops";
import { at, dayPlace, weekS } from "./track";

const city = buildCity(sampleRecap);
const stops = rideStops(sampleRecap, city);
const ride: View = { trainS: 30, from: 4, to: 86, overview: 0 };
const build = (data = sampleRecap, view: View = ride) => {
  const c = buildCity(data);
  const l = land(c, gates(data, c), rideStops(data, c), view);
  return { city: c, all: [...l.ground, ...l.objects] };
};
const boxes = (solids: Solid[], tag: string) =>
  solids.filter((s): s is Box => s.kind === "box" && s.tag === tag);
const dayBox = (solids: Solid[], c: City, date: string): Box | undefined => {
  const plot = c.plots.find((p) => p.date === date);
  if (!plot) return undefined;
  const { s, lateral } = dayPlace(plot);
  const [x, y] = at(s, lateral);
  return boxes(solids, "day").find(
    (b) => Math.abs((b.pivot?.[0] ?? 1e9) - x) < 1e-6 && Math.abs((b.pivot?.[1] ?? 1e9) - y) < 1e-6,
  );
};
const signTexts = (solids: Solid[], col: number) => {
  const [x, y] = at(weekS(col) - 0.8);
  const sign = boxes(solids, "gate-sign").find(
    (b) => Math.abs((b.pivot?.[0] ?? 1e9) - x) < 1e-6 && Math.abs((b.pivot?.[1] ?? 1e9) - y) < 1e-6,
  );
  return sign ? (sign.texts ?? []).filter((t) => t.on === "back").map((t) => t.text) : null;
};

test("a day that has not happened is an outline, a zero day is flat and dim", () => {
  const view: View = { trainS: 80, from: 60, to: 100, overview: 0 };
  const { city: c, all } = build(provisionalRecap, view);
  const notYet = c.plots.find((p) => p.state === "not-yet");
  const zero = c.plots.find((p) => p.state === "zero" && weekS(p.col) > 62 && weekS(p.col) < 98);
  expect(dayBox(all, c, notYet?.date ?? "")?.outline).toBe(true);
  const flat = dayBox(all, c, zero?.date ?? "");
  expect(flat?.outline).toBeUndefined();
  expect(flat?.decals).toBeUndefined();
  expect(flat?.size[2]).toBeCloseTo(0.04);
});

test("days light only as the train nears", () => {
  const { city: c, all } = build();
  const active = c.plots.filter((p) => p.state === "active");
  const near = active.find((p) => weekS(p.col) > 36 && weekS(p.col) < 40);
  const far = active.find((p) => weekS(p.col) > 60 && weekS(p.col) < 64);
  expect(dayBox(all, c, near?.date ?? "")?.decals?.length).toBe(1);
  expect(dayBox(all, c, far?.date ?? "")?.decals).toBeUndefined();
});

test("a busier day stands taller once lit", () => {
  const { city: c, all } = build(sampleRecap, { trainS: 200, from: 0, to: 110, overview: 0 });
  const heights = c.plots
    .filter((p) => p.state === "active")
    .map((p) => ({ count: p.count, h: dayBox(all, c, p.date)?.size[2] ?? 0 }));
  const max = heights.reduce((a, b) => (b.count > a.count ? b : a));
  const min = heights.reduce((a, b) => (b.count < a.count ? b : a));
  expect(max.h).toBeGreaterThan(min.h);
});

test("the overview lights every day with data and drops the sleepers", () => {
  const { city: c, all } = build(sampleRecap, { trainS: 4, from: 0, to: 110, overview: 1 });
  for (const p of c.plots.filter((x) => x.state === "active")) {
    expect(dayBox(all, c, p.date)?.decals?.length).toBe(1);
  }
  expect(boxes(all, "sleeper")).toHaveLength(0);
  expect(boxes(all, "prop")).toHaveLength(0);
  expect(boxes(all, "rail").length).toBeGreaterThan(0);
});

test("January's sign carries one line, a later month's two", () => {
  const { city: c, all } = build(sampleRecap, { trainS: 20, from: 0, to: 110, overview: 0 });
  const g = gates(sampleRecap, c);
  expect(signTexts(all, g[0]?.col ?? 0)).toEqual(["JAN"]);
  // The first later month whose gate stands clear of every plaza.
  const later = g.slice(1).find((gate) => gate.line && signTexts(all, gate.col) !== null);
  if (!later) throw new Error("no gate stands clear of the plazas");
  expect(signTexts(all, later.col)).toEqual([later.name, later.line ?? ""]);
});

test("a gate next to a plaza is left out", () => {
  const { city: c, all } = build(sampleRecap, { trainS: 20, from: 0, to: 110, overview: 0 });
  const g = gates(sampleRecap, c);
  const plazas = stops.filter((s) => s.plaza);
  const hidden = g.filter((gate) =>
    plazas.some((p) => Math.abs(weekS(gate.col) - 0.8 - (p.s + 4.5)) < 8),
  );
  expect(hidden.length).toBeGreaterThan(0);
  for (const gate of hidden) expect(signTexts(all, gate.col)).toBeNull();
});

test("a gate the station's camera looks past folds away while the train is in, and stands again after", () => {
  const g = gates(sampleRecap, city);
  const plazas = stops.filter((stop) => stop.plaza);
  // Behind where the train rests, but not so near the plaza that it is never built.
  const pair = plazas
    .flatMap((stop) => g.map((gate) => ({ stop, gate, s: weekS(gate.col) - 0.8 })))
    .find(({ stop, s }) => s >= stop.s - 12 && s < stop.s - 3.5);
  if (!pair) throw new Error("no gate stands just behind a station in the sample");
  const view = (trainS: number): View => ({ trainS, from: 0, to: 110, overview: 0 });
  const signAt = (trainS: number) => signTexts(build(sampleRecap, view(trainS)).all, pair.gate.col);
  expect(signAt(pair.s - 2)).not.toBeNull();
  expect(signAt(pair.stop.s)).toBeNull();
  expect(signAt(pair.stop.s + 6)).not.toBeNull();
});

test("no gate stands near a station while the train rests there", () => {
  const g = gates(sampleRecap, city);
  for (const stop of stops.filter((x) => x.plaza)) {
    const { all } = build(sampleRecap, { trainS: stop.s, from: 0, to: 110, overview: 0 });
    for (const gate of g) {
      const s = weekS(gate.col) - 0.8;
      if (s >= stop.s - 12 && s <= stop.s + 18) expect(signTexts(all, gate.col)).toBeNull();
    }
  }
});

test("nothing is built outside the view", () => {
  const { all } = build();
  for (const b of all.filter((s): s is Box => s.kind === "box")) {
    // x is not the distance along the rail: on a bend, something beside the rail sits a few
    // units ahead of or behind its place on the line.
    const x = b.pivot?.[0] ?? b.at[0];
    expect(x).toBeGreaterThan(ride.from - 8);
    expect(x).toBeLessThan(ride.to + 8);
  }
});

test("the land is the same for the same view", () => {
  expect(build().all).toEqual(build().all);
});

test("the first and the busiest day carry a beacon, an empty year none", () => {
  const whole: View = { trainS: 20, from: 0, to: 110, overview: 0 };
  expect(boxes(build(sampleRecap, whole).all, "beacon").length).toBeGreaterThanOrEqual(2);
  expect(boxes(build(emptyRecap, whole).all, "beacon")).toHaveLength(0);
});

test("an empty year lays every day flat", () => {
  const { all } = build(emptyRecap, { trainS: 200, from: 0, to: 110, overview: 0 });
  for (const b of boxes(all, "day")) expect(b.size[2]).toBeCloseTo(0.04);
});
