import { expect, test } from "bun:test";
import {
  at,
  CLOSING_ROOM,
  dayPlace,
  FIRST_PLATFORM,
  FIRST_ROW,
  heading,
  PLAZA,
  PLAZA_AHEAD,
  PLAZA_LATERAL,
  ROW_PITCH,
  RUN,
  railEnd,
  stationPlace,
  TURN,
  terminus,
  turning,
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

test("stations sit at even intervals, and the terminus has room of its own before it", () => {
  const places = Array.from({ length: 12 }, (_, i) => stationPlace(i, 12, 53));
  expect(places[0]?.s).toBe(FIRST_PLATFORM);
  expect(places[11]?.s).toBeCloseTo(terminus(53));
  const gaps = places.slice(1).map((p, i) => p.s - (places[i]?.s ?? 0));
  for (const gap of gaps.slice(0, -1)) expect(gap).toBeCloseTo(gaps[0] ?? 0);
  // The closing party's plaza is long: the stop before stands further off.
  expect(gaps.at(-1) ?? 0).toBeCloseTo((gaps[0] ?? 0) + CLOSING_ROOM);
});

test("on a turn a plaza stands outside it, and no two plazas share ground", () => {
  const places = Array.from({ length: 12 }, (_, i) => stationPlace(i, 12, 53));
  for (const place of places) {
    const turn = turning(place.s + PLAZA_AHEAD) || turning(place.s);
    if (turn !== 0) expect(place.side).toBe(turn);
  }
  const centres = places.map((p) => at(p.s + PLAZA_AHEAD, p.side * PLAZA_LATERAL));
  centres.forEach((a, i) => {
    centres.slice(i + 1).forEach((b) => {
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(PLAZA.long + 1);
    });
  });
});

test("the rail doubles back: a half turn left, then a half turn right", () => {
  // The first run heads along +x, the turn brings the train round to head back along -x one
  // turn's width over, and the next turn brings it round again.
  expect(heading(RUN / 2)).toBeCloseTo(0);
  const back = RUN + Math.PI * TURN + RUN / 2;
  expect(heading(back)).toBeCloseTo(Math.PI);
  expect(at(back)[1] - at(RUN / 2)[1]).toBeCloseTo(2 * TURN);
  expect(at(back)[0]).toBeCloseTo(at(RUN / 2)[0]);
  const again = back + RUN + Math.PI * TURN;
  expect(heading(again)).toBeCloseTo(0);
  expect(at(again)[1] - at(RUN / 2)[1]).toBeCloseTo(4 * TURN);
  expect(turning(RUN + 1)).toBe(1);
  expect(turning(back + RUN / 2 + 1)).toBe(-1);
  expect(turning(RUN / 2)).toBe(0);
});

test("the rail has no kinks: neighbouring points are as far apart as the distance between them", () => {
  for (let s = 0; s < 160; s += 0.5) {
    const a = at(s);
    const b = at(s + 0.5);
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(0.5, 1);
    expect(Math.abs(heading(s + 0.5) - heading(s))).toBeLessThan(0.05);
  }
});

test("one station alone sits on the first platform", () => {
  expect(stationPlace(0, 1, 53).s).toBe(FIRST_PLATFORM);
});
