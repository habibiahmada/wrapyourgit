import { expect, test } from "bun:test";
import { emptyRecap, provisionalRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity, type City } from "../city";
import { gates } from "./gates.model";
import { land, SIGN_LATERAL, type View } from "./land";
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
/** The month sign at a gate's week, on whichever side of the rail it stands. */
const signAt = (solids: Solid[], col: number) =>
  boxes(solids, "gate-sign").find((b) =>
    [-1, 1].some((side) => {
      const [x, y] = at(weekS(col) - 0.8, side * SIGN_LATERAL);
      return (
        Math.abs((b.pivot?.[0] ?? 1e9) - x) < 1e-6 && Math.abs((b.pivot?.[1] ?? 1e9) - y) < 1e-6
      );
    }),
  );
const signTexts = (solids: Solid[], col: number) => {
  const sign = signAt(solids, col);
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
  const { city: c, all } = build(sampleRecap, { trainS: 0, from: 0, to: 110, overview: 0 });
  const g = gates(sampleRecap, c);
  expect(signTexts(all, g[0]?.col ?? 0)).toEqual(["JAN"]);
  expect(g[2]?.line).not.toBeNull();
  expect(signTexts(all, g[2]?.col ?? 0)).toEqual(["MAR", g[2]?.line ?? ""]);
});

test("every month has its sign beside the rail, and it stays put wherever the train is", () => {
  const view = (trainS: number): View => ({ trainS, from: 0, to: 110, overview: 0 });
  const g = gates(sampleRecap, city);
  const far = build(sampleRecap, view(0)).all;
  for (const gate of g) expect(signAt(far, gate.col)).toBeDefined();
  // At rest in each station nothing has folded, moved or gone.
  for (const stop of stops.filter((x) => x.plaza)) {
    const here = build(sampleRecap, view(stop.s)).all;
    for (const gate of g) expect(signAt(here, gate.col)).toEqual(signAt(far, gate.col));
  }
});

test("a month sign is low, and never stands in front of a station's own sign", () => {
  const { all } = build(sampleRecap, { trainS: 0, from: 0, to: 110, overview: 0 });
  const plazas = stops.filter((x) => x.plaza);
  for (const gate of gates(sampleRecap, city)) {
    const sign = signAt(all, gate.col);
    if (!sign) throw new Error(`no sign for ${gate.name}`);
    // Lower than the train, so it never stands in front of a station's hero.
    expect(sign.at[2] + sign.size[2]).toBeLessThan(2);
    const s = weekS(gate.col) - 0.8;
    for (const plaza of plazas.filter((x) => s > x.s - 5 && s < x.s + 2)) {
      const [x, y] = at(s, -plaza.side * SIGN_LATERAL);
      expect(sign.pivot?.[0]).toBeCloseTo(x);
      expect(sign.pivot?.[1]).toBeCloseTo(y);
    }
  }
});

test("between two stations a month sign keeps to the side of the one behind it", () => {
  // The camera's shot in the middle of a move is on the other side: a sign there would pass
  // between the camera and the train.
  const { all } = build(sampleRecap, { trainS: 0, from: 0, to: 110, overview: 0 });
  const plazas = stops.filter((x) => x.plaza);
  let checked = 0;
  for (const gate of gates(sampleRecap, city)) {
    const s = weekS(gate.col) - 0.8;
    const behind = plazas.findLast((x) => x.s <= s);
    if (!behind || plazas.some((x) => s > x.s - 5 && s < x.s + 2)) continue;
    const [x, y] = at(s, behind.side * SIGN_LATERAL);
    expect(signAt(all, gate.col)?.pivot?.[0]).toBeCloseTo(x);
    expect(signAt(all, gate.col)?.pivot?.[1]).toBeCloseTo(y);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
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
