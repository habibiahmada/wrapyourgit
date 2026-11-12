import { expect, test } from "bun:test";
import { sampleRecap } from "../../../fixtures/sample-recap";
import { buildCity } from "../../city";
import { HERO_TAGS } from "../model";
import type { Box, Solid } from "../prims";
import { rideStops } from "../stops";
import { STATIONS } from "./index";
import { stationContext } from "./kit";

const city = buildCity(sampleRecap);
const stops = rideStops(sampleRecap, city);

/** What a stop draws at rest (`overview` 0) or from high over the year (1). */
function drawn(kind: string, overview = 0): { all: Solid[]; town: Box[]; slab: Box; side: number } {
  const stop = stops.find((s) => s.kind === kind);
  const station = stop && STATIONS[stop.kind];
  if (!stop || !station) throw new Error(`no station for ${kind}`);
  const all = station(stationContext(sampleRecap, city, stop, 1, 0, overview));
  const slab = all.find((s): s is Box => s.kind === "box" && s.tag === "plaza");
  if (!slab) throw new Error(`no plaza at ${kind}`);
  const town = all.filter((s): s is Box => s.kind === "box" && s.tag === "scenery");
  return { all, town, slab, side: stop.side };
}

/** A lit window: a warm or a blue-white pane on a building's upright faces. */
const isPane = (d: { on: string; fill: string }) =>
  d.on === "all" && (d.fill === "#ffd866" || d.fill === "#9ecbff");
const panes = (boxes: Box[]) =>
  boxes.reduce((sum, b) => sum + (b.decals ?? []).filter(isPane).length, 0);

const TOWNS = [
  "first-day",
  "private",
  "busiest",
  "rhythm",
  "languages",
  "projects",
  "community",
  "engineering",
  "versus",
];

test("every plaza but the archetype's stands in a town", () => {
  for (const kind of TOWNS) {
    const { town } = drawn(kind);
    expect({ kind, boxes: town.length > 20 }).toEqual({ kind, boxes: true });
    // Buildings have lit windows painted on.
    expect({ kind, lit: panes(town) > 0 }).toEqual({ kind, lit: true });
  }
  // The archetype's picture is a city block already, and wider than its plaza.
  expect(drawn("archetype").town).toHaveLength(0);
});

test("no scenery stands between the rail and a plaza, or at the end the camera looks from", () => {
  for (const kind of TOWNS) {
    const { town, slab, side } = drawn(kind);
    const [long, deep] = slab.size;
    const [px, py] = slab.pivot ?? [0, 0];
    for (const box of town) {
      // A part is placed along and across the rail from the plaza's middle; the rail is on `side`.
      const along = box.at[0] + box.size[0] / 2 - px;
      const across = (box.at[1] + box.size[1] / 2 - py) * side;
      const behind = across < -deep / 2;
      const farEnd = along > long / 2;
      expect({ kind, clear: behind || farEnd }).toEqual({ kind, clear: true });
      // And never toward the rail from the plaza's near edge.
      expect({ kind, across: across < deep / 2 }).toEqual({ kind, across: true });
    }
  }
});

test("scenery prints nothing and is nothing the camera frames", () => {
  for (const kind of TOWNS) {
    for (const box of drawn(kind).town) {
      expect(box.texts ?? []).toEqual([]);
      expect(HERO_TAGS.includes(box.tag ?? "")).toBe(false);
    }
  }
});

test("from high over the year a town keeps every box and sheds its fine paint", () => {
  const count = (boxes: Box[]) => boxes.reduce((sum, b) => sum + (b.decals?.length ?? 0), 0);
  for (const kind of TOWNS) {
    const near = drawn(kind, 0).town;
    const far = drawn(kind, 1).town;
    // Nothing appears or goes as the camera climbs: only paint thins out.
    expect(far).toHaveLength(near.length);
    expect(count(far)).toBeLessThan(count(near) / 3);
    // Halfway up, some windows are still lit: they go out a few at a time.
    expect(panes(drawn(kind, 0.5).town)).toBeGreaterThan(0);
    expect(panes(drawn(kind, 0.5).town)).toBeLessThan(panes(near));
    expect(panes(far)).toBe(0);
  }
});

test("a town is the same on every frame", () => {
  expect(drawn("languages").town).toEqual(drawn("languages").town);
});
