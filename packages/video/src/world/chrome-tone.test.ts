import { expect, test } from "bun:test";
import { palette } from "../theme";
import { chromeDarkness, chromeInk, edgeTone, mixHex, type Tone } from "./chrome-tone";
import { SCENE_TONE } from "./scenes";
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

test("edgeTone: one tone covers both edges, a split tone gives each its own, none is light", () => {
  expect(edgeTone("dark", "top")).toBe("dark");
  expect(edgeTone("dark", "bottom")).toBe("dark");
  expect(edgeTone({ top: "light", bottom: "dark" }, "top")).toBe("light");
  expect(edgeTone({ top: "light", bottom: "dark" }, "bottom")).toBe("dark");
  expect(edgeTone(undefined, "bottom")).toBe("light");
});

test("chromeDarkness per edge: the footer darkens over dark ground while the bar stays light", () => {
  const scenes = ["light", { top: "light", bottom: "dark" }, "light"] as const;
  const at = (edge: "top" | "bottom") =>
    chromeDarkness(
      scenes.map((tone) => edgeTone(tone, edge)),
      300,
      timeline,
    );
  expect(at("top")).toBe(0);
  expect(at("bottom")).toBe(1);
});

test("the runway and the garden soil are dark under the footer, their skies light under the bar", () => {
  for (const kind of ["engineering", "languages"] as const) {
    expect(edgeTone(SCENE_TONE[kind], "top")).toBe("light");
    expect(edgeTone(SCENE_TONE[kind], "bottom")).toBe("dark");
  }
  for (const kind of ["projects", "versus"] as const)
    expect(edgeTone(SCENE_TONE[kind], "bottom")).toBe("light");
  expect(edgeTone(SCENE_TONE.closing, "top")).toBe("dark");
});
