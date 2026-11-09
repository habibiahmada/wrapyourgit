import { expect, test } from "bun:test";
import { palette } from "../theme";
import { chromeDarkness, chromeInk, mixHex, type Tone } from "./chrome-tone";
import type { Timeline } from "./timeline";

const timeline = {
  stopFrames: [100, 300, 500],
  moveFrames: [0, 100, 100],
  durationInFrames: 600,
} as unknown as Timeline;
const tones: Tone[] = ["light", "dark", "light"];

test("chromeDarkness: dark at the dark stop's rest, light at the others", () => {
  expect(chromeDarkness(tones, 100, timeline)).toBe(0);
  expect(chromeDarkness(tones, 300, timeline)).toBe(1);
  expect(chromeDarkness(tones, 500, timeline)).toBe(0);
});

test("chromeDarkness: crossfades over the move in and out, following cardOpacity", () => {
  const into = chromeDarkness(tones, 250, timeline);
  expect(into).toBeGreaterThan(0);
  expect(into).toBeLessThan(1);
  const out = chromeDarkness(tones, 450, timeline);
  expect(out).toBeGreaterThan(0);
  expect(out).toBeLessThan(1);
});

test("chromeInk: ink when light, paper when dark, a blend between", () => {
  expect(chromeInk(0)).toBe(palette.ink.toLowerCase());
  expect(chromeInk(1)).toBe(palette.paper.toLowerCase());
  expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
});
