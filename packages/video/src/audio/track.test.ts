import { describe, expect, test } from "bun:test";
import { loopSeconds, TRACK } from "./track";

describe("TRACK.loop", () => {
  const { startBeat, endBeat } = TRACK.loop;

  test("starts and ends on bar lines of the same chord", () => {
    expect(startBeat % 4).toBe(0);
    expect(endBeat % 4).toBe(0);
    // One chord per bar, four chords in the progression.
    expect((startBeat / 4) % 4).toBe((endBeat / 4) % 4);
  });

  test("stays inside the full arrangement, clear of risers and the climax rest", () => {
    expect(startBeat).toBeGreaterThanOrEqual(TRACK.sections.drop);
    expect(endBeat).toBeLessThanOrEqual(TRACK.sections.climax - 8);
    expect(endBeat).toBeGreaterThan(startBeat);
  });

  test("converts to seconds in the file", () => {
    expect(loopSeconds()).toEqual({ start: 20, end: 44 });
  });
});
