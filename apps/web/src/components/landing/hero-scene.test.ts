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

  test("towers have lit windows, none on a storey hidden by the tower in front of that face", () => {
    const towers = scene.boxes.filter((b) => b.size[0] === 0.84 && b.size[1] === 0.84);
    const withWindows = towers.filter((b) => (b.panes?.length ?? 0) > 0);
    expect(withWindows.length).toBeGreaterThan(10);
    for (const tower of withWindows) {
      // The neighbours one plot toward the viewer, by face.
      const front = (dx: number, dy: number) =>
        towers.find(
          (b) =>
            Math.abs(b.at[0] - (tower.at[0] + dx)) < 1e-6 &&
            Math.abs(b.at[1] - (tower.at[1] + dy)) < 1e-6,
        )?.size[2] ?? 0;
      for (const pane of tower.panes ?? []) {
        const over = pane.face === "left" ? front(0, 1) : front(1, 0);
        expect(pane.z[0]).toBeGreaterThanOrEqual(over);
        expect(pane.z[1]).toBeLessThan(tower.size[2]);
      }
    }
    // The busiest building is lit all over and carries no windows.
    expect(scene.boxes.find((b) => b.tone === TONES.lit && b.at[2] === 0)?.panes).toBeUndefined();
  });

  test("streets run round the two near sides, with cars and trees clear of the towers", () => {
    const beyond = scene.boxes.filter(
      (b) => b.at[2] >= 0 && b.at[2] < 2 && (b.at[1] >= 7.1 || b.at[0] >= HERO_WEEKS + 0.1),
    );
    // Roads, their marks, traffic, trees and the kerbs.
    expect(beyond.length).toBeGreaterThan(60);
    // Cars are the only boxes with dark glass on both faces.
    const cabins = scene.boxes.filter((b) => b.panes?.some((p) => p.fill === "#0d1117"));
    expect(cabins.length).toBeGreaterThanOrEqual(8);
  });

  test("no two boxes share volume", () => {
    const boxes = scene.boxes;
    const clashes = boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => intersects(a, b)));
    expect(clashes).toEqual([]);
  });
});
