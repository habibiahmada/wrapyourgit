import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { sampleRecap } from "@wyg/video/sample";
import { HERO_WEEKS, heroScene } from "./hero-scene";
import { intersects, TONES } from "./iso";

describe("heroScene", () => {
  const scene = heroScene(sampleRecap);

  test("shows a quarter around the busiest day, the busiest building lit", () => {
    expect(scene.weeks[1] - scene.weeks[0] + 1).toBe(HERO_WEEKS);
    expect(scene.busiest).not.toBeNull();
    expect(scene.boxes.filter((b) => b.tone === TONES.lit).length).toBeGreaterThanOrEqual(1);
  });

  test("has three linked modules", () => {
    expect(scene.modules.map((m) => m.kind)).toEqual(["languages", "stars", "letter"]);
    expect(scene.links).toHaveLength(3);
  });

  test("a year with no contributions still draws the slab and modules, nothing lit", () => {
    const empty: RecapData = {
      ...sampleRecap,
      contributions: {
        ...sampleRecap.contributions,
        calendar: sampleRecap.contributions.calendar.map((day) => ({ ...day, count: 0 })),
        busiestDay: null,
      },
    };
    const flat = heroScene(empty);
    expect(flat.busiest).toBeNull();
    expect(flat.modules).toHaveLength(3);
    expect(flat.boxes.some((b) => b.tone.top === TONES.lit.top && b.at[2] === 0)).toBe(false);
  });

  test("no two boxes share volume", () => {
    const boxes = scene.boxes;
    const clashes = boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => intersects(a, b)));
    expect(clashes).toEqual([]);
  });
});
