import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { sampleRecap } from "../fixtures/sample-recap";
import { PLOT_SPAN } from "./camera";
import { cardOpacity, cityOpacity, formatDay } from "./fade";
import { buildWorld } from "./model";
import type { WorldMode } from "./timeline";

const at = (span: number) => ({ x: 0, y: 0, span });

test("cityOpacity: 1 at the city span and wider, 0 at 3 plot spans and closer", () => {
  expect(cityOpacity(at(60), 60)).toBe(1);
  expect(cityOpacity(at(90), 60)).toBe(1);
  expect(cityOpacity(at(3 * PLOT_SPAN), 60)).toBe(0);
  expect(cityOpacity(at(PLOT_SPAN), 60)).toBe(0);
  const mid = cityOpacity(at(20), 60);
  expect(mid).toBeGreaterThan(0);
  expect(mid).toBeLessThan(1);
});

for (const mode of ["interactive", "video"] as WorldMode[]) {
  test(`cardOpacity (${mode}): a card shows only at its own stop`, () => {
    const { timeline } = buildWorld(sampleRecap, VIDEO_FORMATS["9x16"], mode, 30);
    const { stopFrames, moveFrames } = timeline;
    for (let i = 0; i < stopFrames.length; i++) {
      const rest = stopFrames[i] as number;
      expect(cardOpacity(i, rest, timeline)).toBe(1);
      if (i > 0) {
        expect(cardOpacity(i, stopFrames[i - 1] as number, timeline)).toBe(0);
        const mid = rest - Math.round((moveFrames[i] as number) / 2);
        expect(cardOpacity(i, mid, timeline)).toBeGreaterThan(0);
        expect(cardOpacity(i, mid, timeline)).toBeLessThan(1);
      }
      const next = stopFrames[i + 1];
      if (next !== undefined) {
        expect(cardOpacity(i, next, timeline)).toBe(0);
        const mid = next - Math.round((moveFrames[i + 1] as number) / 2);
        expect(cardOpacity(i, mid, timeline)).toBeGreaterThan(0);
        expect(cardOpacity(i, mid, timeline)).toBeLessThan(1);
      }
    }
  });
}

test("cardOpacity: video mode holds the card for the whole rest", () => {
  const { timeline } = buildWorld(sampleRecap, VIDEO_FORMATS["9x16"], "video", 30);
  const rest = timeline.stopFrames[2] as number;
  expect(cardOpacity(2, rest + 90, timeline)).toBe(1);
  expect(cardOpacity(0, 0, timeline)).toBe(1);
  expect(cardOpacity(timeline.stopFrames.length - 1, timeline.durationInFrames - 1, timeline)).toBe(
    1,
  );
});

test("formatDay: month and day without the host's locale", () => {
  expect(formatDay("2026-01-03")).toBe("January 3");
  expect(formatDay("2026-12-31")).toBe("December 31");
});
