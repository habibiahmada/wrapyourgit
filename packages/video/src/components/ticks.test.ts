import { describe, expect, test } from "bun:test";
import { tickFrames } from "./ticks";

describe("tickFrames", () => {
  test("ticks once per change of a small number", () => {
    const frames = tickFrames(3, 0, 30);
    expect(frames).toHaveLength(3);
    expect(frames.every((frame) => frame > 0 && frame <= 30)).toBe(true);
  });

  test("never ticks twice within the minimum gap, in order, inside the count", () => {
    const frames = tickFrames(12_345, 15, 60);
    expect(frames.length).toBeGreaterThan(5);
    for (let i = 1; i < frames.length; i++) {
      expect((frames[i] ?? 0) - (frames[i - 1] ?? 0)).toBeGreaterThanOrEqual(2);
    }
    expect(frames[0]).toBeGreaterThanOrEqual(15);
    expect(frames.at(-1)).toBeLessThanOrEqual(60);
  });

  test("is silent for zero", () => {
    expect(tickFrames(0, 0, 30)).toEqual([]);
  });
});
