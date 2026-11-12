import { expect, test } from "bun:test";
import { emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity } from "../city";
import type { StopKind } from "../stops";
import { RIDE_KINDS, rideStops } from "./stops";
import { FIRST_PLATFORM, PLAZA_AHEAD, terminus, turning } from "./track";

// The ride draws its stops in the story's order; a letter page past the first is left out here.
const KINDS: StopKind[] = [...RIDE_KINDS];

test("the ride keeps the story's order and only the stations it can draw", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap), { letter: false });
  expect(stops.map((s) => s.kind)).toEqual(KINDS);
});

test("stations run forward along the rail and never share a place", () => {
  const s = rideStops(sampleRecap, buildCity(sampleRecap))
    .filter((x) => x.kind !== "city")
    .map((x) => x.s);
  for (let i = 1; i < s.length; i++) expect(s[i] ?? 0).toBeGreaterThan(s[i - 1] ?? 0);
});

test("the ride starts on the first platform and ends at the terminus", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap));
  expect(stops[0]?.s).toBe(FIRST_PLATFORM);
  expect(stops.at(-1)?.s).toBeCloseTo(terminus(53));
});

test("the city overview waits between its neighbours and has no plaza", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap));
  const i = stops.findIndex((x) => x.kind === "city");
  expect(stops[i]?.s).toBeCloseTo(((stops[i - 1]?.s ?? 0) + (stops[i + 1]?.s ?? 0)) / 2);
  expect(stops[i]?.plaza).toBe(false);
});

test("only chapters with a hero get a plaza", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap));
  expect(stops.filter((s) => s.plaza).map((s) => s.kind)).toEqual(
    KINDS.filter((kind) => !["hello", "city", "closing"].includes(kind)),
  );
});

test("a plaza on a turn stands outside it, and on a straight run neighbours take opposite sides", () => {
  const plazas = rideStops(sampleRecap, buildCity(sampleRecap)).filter((s) => s.plaza);
  for (const [i, plaza] of plazas.entries()) {
    const turn = turning(plaza.s + PLAZA_AHEAD) || turning(plaza.s);
    // Round to the left the outside is the rail's right (1), and the other way round.
    if (turn !== 0) expect({ i, side: plaza.side }).toEqual({ i, side: turn });
  }
  expect(plazas.some((plaza) => turning(plaza.s) !== 0)).toBe(true);
});

test("an empty year still gets every station it has something to say at", () => {
  // All but the busiest day: an empty year has none, and the story has no stop for it.
  expect(rideStops(emptyRecap, buildCity(emptyRecap)).map((s) => s.kind)).toEqual(
    KINDS.filter((kind) => kind !== "busiest"),
  );
});
