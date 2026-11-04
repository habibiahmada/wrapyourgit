import { describe, expect, test } from "bun:test";
import { TRACK } from "./audio/track";
import { startBeat, TIMELINE, TOTAL_BEATS } from "./timeline";

describe("timeline and soundtrack", () => {
  test("the story is exactly as long as the track", () => {
    expect(TOTAL_BEATS).toBe(TRACK.beats);
  });

  test("music sections start on scene cuts", () => {
    expect(startBeat("contributions")).toBe(TRACK.sections.drop);
    expect(startBeat("identity")).toBe(TRACK.sections.climax);
    expect(startBeat("closing")).toBe(TRACK.sections.outro);
  });

  test("lasts 60-120 s, the PRD range for the video", () => {
    const seconds = (TOTAL_BEATS * 60) / TRACK.bpm;
    expect(seconds).toBeGreaterThanOrEqual(60);
    expect(seconds).toBeLessThanOrEqual(120);
  });

  test("neighbouring scenes never share a field, so every cell transition shows", () => {
    for (let i = 1; i < TIMELINE.length; i++) {
      expect(TIMELINE[i]?.field).not.toBe(TIMELINE[i - 1]?.field);
    }
  });

  test("every cut after the intro has a transition, and neighbouring cuts differ", () => {
    const [intro, ...rest] = TIMELINE;
    expect(intro && "transition" in intro).toBe(false);
    for (const scene of rest) expect("transition" in scene).toBe(true);
    for (let i = 1; i < rest.length; i++) {
      expect(transitionOf(rest[i])).not.toBe(transitionOf(rest[i - 1]));
    }
  });

  test("the climax zooms in", () => {
    expect(transitionOf(TIMELINE.find((scene) => scene.id === "identity"))).toBe("zoom");
  });
});

function transitionOf(scene: (typeof TIMELINE)[number] | undefined) {
  return scene && "transition" in scene ? scene.transition : undefined;
}
