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

  test("every cut after the intro has its own transition, none repeated", () => {
    const [intro, ...rest] = TIMELINE;
    expect(intro && "transition" in intro).toBe(false);
    const moves = rest.map(transitionOf);
    expect(moves.every(Boolean)).toBe(true);
    expect(new Set(moves).size).toBe(moves.length);
  });

  test("the climax gets the flash", () => {
    expect(transitionOf(TIMELINE.find((scene) => scene.id === "identity"))).toBe("flash");
  });
});

function transitionOf(scene: (typeof TIMELINE)[number] | undefined) {
  return scene && "transition" in scene ? scene.transition : undefined;
}
