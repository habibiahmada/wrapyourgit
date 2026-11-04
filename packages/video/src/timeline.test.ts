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

  test("neighbouring scenes never share a field, so every cell wipe shows", () => {
    for (let i = 1; i < TIMELINE.length; i++) {
      expect(TIMELINE[i]?.field).not.toBe(TIMELINE[i - 1]?.field);
    }
  });
});
