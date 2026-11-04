import { describe, expect, test } from "bun:test";
import { busiestMonth, countActiveDays, longestStreak, monthlyTotals } from "./calendar";

const days = (entries: [string, number][]) => entries.map(([date, count]) => ({ date, count }));

describe("longestStreak", () => {
  test("empty calendar has no streak", () => {
    expect(longestStreak([])).toEqual({ days: 0, start: null, end: null });
  });

  test("finds the longest run, not the latest", () => {
    const calendar = days([
      ["2026-01-01", 1],
      ["2026-01-02", 3],
      ["2026-01-03", 2],
      ["2026-01-04", 0],
      ["2026-01-05", 5],
    ]);
    expect(longestStreak(calendar)).toEqual({ days: 3, start: "2026-01-01", end: "2026-01-03" });
  });

  test("a missing date breaks the streak", () => {
    const calendar = days([
      ["2026-02-27", 1],
      ["2026-02-28", 1],
      ["2026-03-02", 1],
    ]);
    expect(longestStreak(calendar).days).toBe(2);
  });

  test("crosses month boundaries", () => {
    const calendar = days([
      ["2026-01-31", 1],
      ["2026-02-01", 1],
    ]);
    expect(longestStreak(calendar)).toEqual({ days: 2, start: "2026-01-31", end: "2026-02-01" });
  });
});

describe("monthly aggregates", () => {
  const calendar = days([
    ["2026-01-10", 2],
    ["2026-03-01", 4],
    ["2026-03-02", 0],
    ["2026-12-31", 4],
  ]);

  test("counts active days", () => {
    expect(countActiveDays(calendar)).toBe(3);
  });

  test("sums per month", () => {
    expect(monthlyTotals(calendar)).toEqual([2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4]);
  });

  test("busiest month prefers the earlier month on ties", () => {
    expect(busiestMonth(calendar)).toEqual({ month: 3, count: 4 });
  });

  test("busiest month is null for an empty year", () => {
    expect(busiestMonth([])).toBeNull();
  });
});
