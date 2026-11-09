import { expect, test } from "bun:test";
import { sampleRecap } from "../fixtures/sample-recap";
import { buildCity } from "./city";
import { buildStops } from "./stops";
import { withCalendar, withMeta } from "./test-fixtures";

const plotOf = (stops: ReturnType<typeof buildStops>, id: string) =>
  stops.find((s) => s.id === id)?.plot;

test("stops come in story order, letter pages expanded", () => {
  const city = buildCity(sampleRecap);
  const ids = buildStops(sampleRecap, city, { letterPages: 2 }).map((s) => s.id);
  expect(ids).toEqual([
    "hello",
    "first-day",
    "private",
    "city",
    "busiest",
    "rhythm",
    "languages",
    "projects",
    "community",
    "engineering",
    "archetype",
    "versus",
    "letter-1",
    "letter-2",
    "closing",
  ]);
});

test("letter stops carry their 1-based page", () => {
  const stops = buildStops(sampleRecap, buildCity(sampleRecap), { letterPages: 2 });
  expect(stops.filter((s) => s.kind === "letter").map((s) => s.page)).toEqual([1, 2]);
});

test("natural dates: hello Jan 1, busiest on the busiest plot, closing on the last day with data", () => {
  const city = buildCity(sampleRecap);
  const stops = buildStops(sampleRecap, city);
  expect(plotOf(stops, "hello")).toBe(0);
  expect(plotOf(stops, "busiest")).toBe(city.busiestIndex);
  expect(plotOf(stops, "closing")).toBe(city.lastDataIndex);
  expect(plotOf(stops, "city")).toBeNull();
  const first = plotOf(stops, "first-day");
  expect(first === city.firstActiveIndex || first === city.busiestIndex).toBe(true);
});

test("every stop but the city has its own plot", () => {
  const stops = buildStops(sampleRecap, buildCity(sampleRecap));
  const plots = stops.flatMap((s) => (s.plot === null ? [] : [s.plot]));
  expect(new Set(plots).size).toBe(plots.length);
});

test("fixed-plot stops move forward through the year", () => {
  const stops = buildStops(sampleRecap, buildCity(sampleRecap), { letterPages: 3 });
  const fixedKinds = new Set(["private", "rhythm", "languages", "projects", "community"]);
  const fixed = stops
    .filter(
      (s) =>
        fixedKinds.has(s.kind) || ["engineering", "archetype", "versus", "letter"].includes(s.kind),
    )
    .map((s) => s.plot as number);
  for (let i = 1; i < fixed.length; i++) expect(fixed[i]).toBeGreaterThan(fixed[i - 1] as number);
});

test("collisions: busiest on Jan 1 and first day equal to busiest still give distinct plots", () => {
  const data = withCalendar(sampleRecap, { "2026-01-01": 9 });
  const city = buildCity(data);
  expect(city.busiestIndex).toBe(0);
  expect(city.firstActiveIndex).toBe(0);
  const plots = buildStops(data, city).flatMap((s) => (s.plot === null ? [] : [s.plot]));
  expect(new Set(plots).size).toBe(plots.length);
  expect(plots.every((p) => p >= 0 && p <= city.lastDataIndex)).toBe(true);
});

test("an empty year has no busiest stop and a fixed first-day plot", () => {
  const data = withCalendar(sampleRecap, {});
  const city = buildCity(data);
  const stops = buildStops(data, city);
  expect(stops.map((s) => s.id)).not.toContain("busiest");
  const plots = stops.flatMap((s) => (s.plot === null ? [] : [s.plot]));
  expect(new Set(plots).size).toBe(plots.length);
  expect(typeof plotOf(stops, "first-day")).toBe("number");
});

test("a provisional year ending 2026-01-20 still fits every stop before the closing plot", () => {
  const data = withMeta(sampleRecap, { periodEnd: "2026-01-20", isFinal: false });
  const city = buildCity(data);
  expect(city.lastDataIndex).toBe(19);
  const stops = buildStops(data, city, { letterPages: 2 });
  const plots = stops.flatMap((s) => (s.plot === null ? [] : [s.plot]));
  expect(new Set(plots).size).toBe(plots.length);
  expect(plots.every((p) => p <= city.lastDataIndex)).toBe(true);
  expect(plotOf(stops, "closing")).toBe(19);
});
