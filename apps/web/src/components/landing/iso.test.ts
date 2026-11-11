import { describe, expect, test } from "bun:test";
import { type Box, boxPaths, iso, paintOrder, TONES, viewBoxOf } from "./iso";

describe("iso", () => {
  test("uses the story city's 2:1 projection", () => {
    expect(iso([1, 0, 0])).toEqual([1, 0.5]);
    expect(iso([0, 1, 0])).toEqual([-1, 0.5]);
    expect(iso([0, 0, 1])).toEqual([0, -1]);
  });

  test("a box has three closed faces in its tone", () => {
    const faces = boxPaths({ at: [0, 0, 0], size: [1, 1, 1], tone: TONES.dark });
    for (const face of [faces.top, faces.left, faces.right]) {
      expect(face.startsWith("M")).toBe(true);
      expect(face.endsWith("Z")).toBe(true);
    }
    expect(faces.tone).toBe(TONES.dark);
  });

  test("paints far boxes first and stacked boxes after their base", () => {
    const near: Box = { at: [3, 3, 0], size: [1, 1, 1], tone: TONES.dark };
    const far: Box = { at: [0, 0, 0], size: [1, 1, 1], tone: TONES.dark };
    const base: Box = { at: [6, 0, 0], size: [1, 1, 1], tone: TONES.dark };
    const stacked: Box = { at: [6, 0, 1], size: [1, 1, 1], tone: TONES.lit };
    expect(paintOrder([near, stacked, far, base])).toEqual([far, near, base, stacked]);
  });

  test("the viewBox holds every corner", () => {
    const [x, y, w, h] = viewBoxOf([{ at: [0, 0, 0], size: [2, 1, 3], tone: TONES.dark }], [], 0)
      .split(" ")
      .map(Number);
    expect([x, y, w, h]).toEqual([-1, -3, 3, 4.5]);
  });
});
