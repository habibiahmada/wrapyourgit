import { expect, test } from "bun:test";
import { emptyRecap, provisionalRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity } from "../city";
import { withCalendar } from "../test-fixtures";
import { gates } from "./gates.model";

test("twelve gates, January without a total", () => {
  const g = gates(sampleRecap, buildCity(sampleRecap));
  expect(g.map((x) => x.name)).toEqual([
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ]);
  expect(g[0]).toMatchObject({ month: 0, before: null, line: null });
});

test("a gate counts the days before its month, by date", () => {
  const data = withCalendar(sampleRecap, { "2026-01-31": 5, "2026-02-01": 7, "2026-02-28": 2 });
  const g = gates(data, buildCity(data));
  // 31 January counts toward February's gate, 1 February does not.
  expect(g[1]).toMatchObject({ before: 5, line: "5 so far" });
  expect(g[2]).toMatchObject({ before: 14, line: "14 so far" });
});

test("a gate stands at the week of the 1st of its month", () => {
  const city = buildCity(sampleRecap);
  const g = gates(sampleRecap, city);
  expect(g[0]?.col).toBe(0);
  expect(g[1]?.col).toBe(city.plots.find((p) => p.date === "2026-02-01")?.col);
});

test("the last gate plus the rest of the year is the total", () => {
  const dec = gates(sampleRecap, buildCity(sampleRecap))[11];
  const sum = (from: string) =>
    sampleRecap.contributions.calendar
      .filter((d) => d.date >= from)
      .reduce((n, d) => n + d.count, 0);
  expect((dec?.before ?? 0) + sum("2026-12-01")).toBe(sum("2026-01-01"));
});

test("a month that has not started has no total", () => {
  const g = gates(provisionalRecap, buildCity(provisionalRecap));
  expect(g[10]?.before).not.toBeNull();
  expect(g[11]).toMatchObject({ before: null, line: null });
});

test("an empty year reads 0 so far, not a blank", () => {
  expect(gates(emptyRecap, buildCity(emptyRecap))[5]?.line).toBe("0 so far");
});

test("large totals are formatted like every other number", () => {
  const data = withCalendar(sampleRecap, { "2026-01-10": 1234 });
  expect(gates(data, buildCity(data))[1]?.line).toBe("1,234 so far");
});
