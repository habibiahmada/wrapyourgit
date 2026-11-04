import { describe, expect, test } from "bun:test";
import { calendarGrid, fitFontSize, heatLevels } from "./heat";

const days = (counts: number[], start = "2026-01-01") =>
  counts.map((count, i) => {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    return { date: date.toISOString().slice(0, 10), count };
  });

describe("heatLevels", () => {
  test("zero stays level 0 and active days spread across 1-4", () => {
    // Active counts 1-8 give quartile thresholds 3, 5 and 7; a count equal to one stays below it.
    expect(heatLevels(days([0, 1, 2, 3, 4, 5, 6, 7, 8]))).toEqual([0, 1, 1, 1, 2, 2, 3, 3, 4]);
  });

  test("an empty year is all level 0", () => {
    expect(heatLevels(days([0, 0, 0]))).toEqual([0, 0, 0]);
  });

  test("a single active day is level 1, not off the scale", () => {
    expect(heatLevels(days([0, 9, 0]))).toEqual([0, 1, 0]);
  });
});

describe("calendarGrid", () => {
  test("2026-01-01 is a Thursday, so the first week starts at row 4", () => {
    const grid = calendarGrid(days(Array(365).fill(1)));
    expect(grid.cells[0]).toEqual({ week: 0, weekday: 4 });
    expect(grid.cells[3]).toEqual({ week: 1, weekday: 0 });
    expect(grid.weeks).toBe(53);
  });

  test("empty calendar has no weeks", () => {
    expect(calendarGrid([])).toEqual({ cells: [], weeks: 0 });
  });
});

describe("fitFontSize", () => {
  test("caps at the maximum for short text and shrinks long text to fit", () => {
    expect(fitFontSize("Go", 1000, 200)).toBe(200);
    expect(fitFontSize("Jupyter Notebook", 800, 200)).toBeCloseTo(800 / (16 * 0.62));
  });
});
