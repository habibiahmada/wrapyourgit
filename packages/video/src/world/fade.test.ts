import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { sampleRecap } from "../fixtures/sample-recap";
import { PLOT_SPAN } from "./camera";
import {
  cardOpacity,
  cityOpacity,
  contributionsLabel,
  enterProgress,
  formatDay,
  reachedStop,
} from "./fade";
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

test("reachedStop: a stop counts once its rest frame is reached, in either seek direction", () => {
  const stopFrames = [0, 100, 250];
  expect(reachedStop(0, stopFrames)).toBe(0);
  expect(reachedStop(99, stopFrames)).toBe(0); // the frame just before arrival
  expect(reachedStop(100, stopFrames)).toBe(1); // arrival
  expect(reachedStop(180, stopFrames)).toBe(1); // hold
  expect(reachedStop(249, stopFrames)).toBe(1);
  expect(reachedStop(250, stopFrames)).toBe(2);
  // Same answer whichever order the frames are visited in.
  const forward = [99, 100, 249, 250].map((f) => reachedStop(f, stopFrames));
  const backward = [250, 249, 100, 99].map((f) => reachedStop(f, stopFrames)).reverse();
  expect(backward).toEqual(forward);
});

test("contributionsLabel uses the singular for exactly one", () => {
  expect(contributionsLabel(1, "1")).toBe("1 contribution");
  expect(contributionsLabel(0, "0")).toBe("0 contributions");
  expect(contributionsLabel(1234, "1,234")).toBe("1,234 contributions");
});

for (const mode of ["interactive", "video"] as WorldMode[]) {
  test(`enterProgress (${mode}): 0 before the move in, eased over it, 1 from the rest on`, () => {
    const { timeline } = buildWorld(sampleRecap, VIDEO_FORMATS["9x16"], mode, 30);
    const { stopFrames, moveFrames } = timeline;
    expect(enterProgress(0, 0, timeline)).toBe(1);
    for (let i = 1; i < stopFrames.length; i++) {
      const rest = stopFrames[i] as number;
      const move = moveFrames[i] as number;
      expect(enterProgress(i, stopFrames[i - 1] as number, timeline)).toBe(0);
      expect(enterProgress(i, rest - move, timeline)).toBe(0);
      const mid = enterProgress(i, rest - Math.round(move / 2), timeline);
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThan(1);
      expect(enterProgress(i, rest, timeline)).toBe(1);
      // Through the hold and the move out: the scene stays entered while it fades away.
      const next = stopFrames[i + 1] ?? timeline.durationInFrames - 1;
      expect(enterProgress(i, next, timeline)).toBe(1);
      expect(enterProgress(i, Math.round((rest + next) / 2), timeline)).toBe(1);
    }
  });
}

test("enterProgress eases: slow at both ends of the move", () => {
  const timeline = { stopFrames: [0, 100], moveFrames: [0, 100], durationInFrames: 101 };
  const early = enterProgress(1, 10, timeline);
  expect(early).toBeLessThan(0.1);
  expect(enterProgress(1, 50, timeline)).toBeCloseTo(0.5, 5);
  expect(enterProgress(1, 90, timeline)).toBeCloseTo(1 - early, 5);
  expect(enterProgress(5, 50, timeline)).toBe(0);
});
