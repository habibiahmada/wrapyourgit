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

test("natural dates: hello Jan 1, first day and busiest on their own days, closing on the last day", () => {
  const data = withCalendar(sampleRecap, { "2026-05-10": 2, "2026-08-20": 9 });
  const city = buildCity(data);
  const stops = buildStops(data, city);
  expect(plotOf(stops, "hello")).toBe(0);
  expect(plotOf(stops, "first-day")).toBe(city.plots.findIndex((p) => p.date === "2026-05-10"));
  expect(plotOf(stops, "busiest")).toBe(city.plots.findIndex((p) => p.date === "2026-08-20"));
  expect(plotOf(stops, "closing")).toBe(city.lastDataIndex);
  expect(plotOf(stops, "city")).toBeNull();
});

/** Plots in story order, one per place: later letter pages share page 1's plot (ruling R7). */
const plotsOf = (stops: ReturnType<typeof buildStops>) =>
  stops.flatMap((s) => (s.plot === null || (s.page ?? 1) > 1 ? [] : [s.plot]));

test("plots never decrease along the story when the busiest day is late", () => {
  const data = withCalendar(sampleRecap, { "2026-09-15": 9, "2026-02-03": 2 });
  const plots = plotsOf(buildStops(data, buildCity(data), { letterPages: 3 }));
  for (let i = 1; i < plots.length; i++) expect(plots[i]).toBeGreaterThan(plots[i - 1] as number);
});

test("plots never decrease along the story when the first active day is late", () => {
  const data = withCalendar(sampleRecap, { "2026-05-10": 2, "2026-08-20": 9 });
  const plots = plotsOf(buildStops(data, buildCity(data), { letterPages: 3 }));
  for (let i = 1; i < plots.length; i++) expect(plots[i]).toBeGreaterThan(plots[i - 1] as number);
});

test("busiest on Jan 1 keeps plot 0 and hello yields", () => {
  const data = withCalendar(sampleRecap, { "2026-01-01": 9 });
  const stops = buildStops(data, buildCity(data));
  expect(plotOf(stops, "busiest")).toBe(0);
  expect(plotOf(stops, "hello")).not.toBe(0);
});

test("busiest on the last day with data keeps it, closing sits before it", () => {
  const data = withMeta(withCalendar(sampleRecap, { "2026-03-01": 2, "2026-11-09": 9 }), {
    periodEnd: "2026-11-09",
    isFinal: false,
  });
  const city = buildCity(data);
  const stops = buildStops(data, city);
  expect(plotOf(stops, "busiest")).toBe(city.lastDataIndex);
  expect(plotOf(stops, "closing")).toBeLessThan(city.lastDataIndex);
  expect(new Set(plotsOf(stops)).size).toBe(plotsOf(stops).length);
});

test("every stop but the city has its own plot, except letter pages, which share one", () => {
  const stops = buildStops(sampleRecap, buildCity(sampleRecap), { letterPages: 3 });
  const letterPlots = stops.filter((s) => s.kind === "letter").map((s) => s.plot);
  expect(letterPlots).toHaveLength(3);
  expect(typeof letterPlots[0]).toBe("number");
  expect(new Set(letterPlots).size).toBe(1);
  const others = stops.flatMap((s) => (s.plot === null || s.kind === "letter" ? [] : [s.plot]));
  expect(new Set([...others, letterPlots[0]]).size).toBe(others.length + 1);
});

test("fixed-plot stops move forward through the year", () => {
  const NATURAL = new Set(["hello", "first-day", "city", "busiest", "closing"]);
  const stops = buildStops(sampleRecap, buildCity(sampleRecap), { letterPages: 3 });
  const fixed = stops
    .filter((s) => !NATURAL.has(s.kind) && (s.page ?? 1) === 1)
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
  const plots = plotsOf(stops);
  expect(new Set(plots).size).toBe(plots.length);
  expect(plots.every((p) => p <= city.lastDataIndex)).toBe(true);
  expect(plotOf(stops, "closing")).toBe(19);
});
