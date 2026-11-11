import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { sampleRecap } from "@wyg/video/sample";
import { cityPaths } from "./city-paths";

function viewBox(paths: ReturnType<typeof cityPaths>) {
  const [x = 0, y = 0, w = 0, h = 0] = paths.viewBox.split(" ").map(Number);
  return { x, y, w, h };
}

describe("cityPaths", () => {
  const paths = cityPaths(sampleRecap);
  const buildings = paths.weeks.flatMap((week) => week.buildings);
  const active = sampleRecap.contributions.calendar.filter((day) => day.count > 0).length;

  test("draws one building per active day, grouped by week in order", () => {
    expect(buildings).toHaveLength(active);
    const cols = paths.weeks.map((week) => week.col);
    expect(cols).toEqual([...cols].sort((a, b) => a - b));
    expect(paths.ground.length).toBeGreaterThan(0);
  });

  test("fills active days with the contribution greens only", () => {
    const greens = ["#0e4429", "#006d32", "#26a641", "#39d353"];
    for (const building of buildings) expect(greens).toContain(building.top);
  });

  test("marks the busiest day's roof, inside the picture, on its tallest building", () => {
    const busiest = paths.busiest;
    expect(busiest).not.toBeNull();
    const box = viewBox(paths);
    expect(busiest?.x).toBeGreaterThan(box.x);
    expect(busiest?.x).toBeLessThan(box.x + box.w);
    expect(busiest?.y).toBeGreaterThan(box.y);
    const day = sampleRecap.contributions.busiestDay?.date;
    const building = buildings.find((b) => b.date === day);
    expect(building).toBeDefined();
    expect(busiest?.y).toBe(building?.roofY);
    expect(building?.height).toBe(Math.max(...buildings.map((b) => b.height)));
  });

  test("a year with no contributions is all ground: no buildings, no busiest roof", () => {
    const empty: RecapData = {
      ...sampleRecap,
      contributions: {
        ...sampleRecap.contributions,
        calendar: sampleRecap.contributions.calendar.map((day) => ({ ...day, count: 0 })),
        busiestDay: null,
      },
    };
    const flat = cityPaths(empty);
    expect(flat.weeks.flatMap((week) => week.buildings)).toHaveLength(0);
    expect(flat.busiest).toBeNull();
    expect(flat.ground.length).toBeGreaterThan(0);
  });
});
