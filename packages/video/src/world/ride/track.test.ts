import { expect, test } from "bun:test";
import {
  at,
  dayPlace,
  FIRST_PLATFORM,
  FIRST_ROW,
  heading,
  PLAZA,
  ROW_PITCH,
  railEnd,
  stationPlace,
  terminus,
  WEEK,
  weekS,
  YEAR_START,
} from "./track";

test("the rail's point and heading agree", () => {
  const a = at(20);
  const b = at(20.001);
  expect(Math.atan2(b[1] - a[1], b[0] - a[0])).toBeCloseTo(heading(20), 3);
});

test("lateral is to the right of travel", () => {
  // At the first platform the rail heads toward +x and up the page (+y), so its right is -y.
  expect(at(FIRST_PLATFORM, 2)[1]).toBeLessThan(at(FIRST_PLATFORM, 0)[1]);
});

test("a point keeps its height", () => {
  expect(at(30, 1, 2.5)[2]).toBe(2.5);
});

test("three rows of days sit left of the rail and four right", () => {
  expect(dayPlace({ col: 0, row: 0 }).lateral).toBeCloseTo(-(FIRST_ROW + 2 * ROW_PITCH));
  expect(dayPlace({ col: 0, row: 2 }).lateral).toBeCloseTo(-FIRST_ROW);
  expect(dayPlace({ col: 0, row: 3 }).lateral).toBeCloseTo(FIRST_ROW);
  expect(dayPlace({ col: 0, row: 6 }).lateral).toBeCloseTo(FIRST_ROW + 3 * ROW_PITCH);
  expect(dayPlace({ col: 3, row: 6 }).s).toBeCloseTo(YEAR_START + 3 * WEEK);
  expect(weekS(3)).toBeCloseTo(YEAR_START + 3 * WEEK);
});

test("the rail runs past the last week to its buffers", () => {
  expect(railEnd(53)).toBeCloseTo(YEAR_START + 53 * WEEK + 6);
  expect(terminus(53)).toBeCloseTo(railEnd(53) - 4);
});

test("stations sit at even intervals from the first platform to the terminus", () => {
  const places = Array.from({ length: 12 }, (_, i) => stationPlace(i, 12, 53));
  expect(places[0]?.s).toBe(FIRST_PLATFORM);
  expect(places[11]?.s).toBeCloseTo(terminus(53));
  const gaps = places.slice(1).map((p, i) => p.s - (places[i]?.s ?? 0));
  for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0] ?? 0);
});

test("neighbouring plazas are on opposite sides, and same-side plazas clear each other", () => {
  const places = Array.from({ length: 12 }, (_, i) => stationPlace(i, 12, 53));
  places.slice(1).forEach((p, i) => {
    expect(p.side).toBe(-(places[i]?.side ?? 0) as 1 | -1);
  });
  expect((places[2]?.s ?? 0) - (places[0]?.s ?? 0)).toBeGreaterThan(PLAZA.long + 2);
});

test("one station alone sits on the first platform", () => {
  expect(stationPlace(0, 1, 53).s).toBe(FIRST_PLATFORM);
});
