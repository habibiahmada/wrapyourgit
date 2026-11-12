import { describe, expect, test } from "bun:test";
import { type Box, boxPaths, intersects, iso, paintOrder, panePath, TONES, viewBoxOf } from "./iso";

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

  test("a pane lies on the face it names, between the heights it gives", () => {
    const box: Box = { at: [2, 3, 0], size: [1, 1, 4], tone: TONES.dark };
    // The left face is the one toward +y: every corner of the pane has y = 4.
    const left = panePath(box, { face: "left", u: [0.25, 0.75], z: [1, 2], fill: "#fff" });
    const [a, b] = iso([2.25, 4, 2]);
    const [c, d] = iso([2.75, 4, 1]);
    expect(left).toContain(`M${a} ${b}`);
    expect(left).toContain(`L${c} ${d}`);
    expect(left.endsWith("Z")).toBe(true);
    // The right face is the one toward +x: x = 3.
    const right = panePath(box, { face: "right", u: [0, 1], z: [0, 4], fill: "#fff" });
    const [e, f] = iso([3, 3, 4]);
    expect(right.startsWith(`M${e} ${f}`)).toBe(true);
  });

  test("paints a big base before everything standing on it, wherever its centre is", () => {
    const slab: Box = { at: [0, 0, -1], size: [13, 7, 1], tone: TONES.deep };
    const back: Box = { at: [0, 0, 0], size: [1, 1, 3], tone: TONES.dark };
    const front: Box = { at: [12, 6, 0], size: [1, 1, 1], tone: TONES.dark };
    const order = paintOrder([front, back, slab]);
    expect(order.indexOf(slab)).toBeLessThan(order.indexOf(back));
    expect(order.indexOf(slab)).toBeLessThan(order.indexOf(front));
  });

  test("paints the box behind before the one in front, and a base before what it carries", () => {
    const left: Box = { at: [0, 0, 0], size: [1, 1, 2], tone: TONES.dark };
    const right: Box = { at: [1, 0, 0], size: [1, 1, 1], tone: TONES.dark };
    const base: Box = { at: [5, 5, 0], size: [1, 1, 1], tone: TONES.dark };
    const stacked: Box = { at: [5, 5, 1], size: [1, 1, 1], tone: TONES.lit };
    const order = paintOrder([stacked, right, base, left]);
    expect(order.indexOf(left)).toBeLessThan(order.indexOf(right));
    expect(order.indexOf(base)).toBeLessThan(order.indexOf(stacked));
  });

  test("detects boxes that share volume, not ones that only touch", () => {
    const a: Box = { at: [0, 0, 0], size: [1, 1, 1], tone: TONES.dark };
    expect(intersects(a, { at: [0.9, 0, 0], size: [1, 1, 1], tone: TONES.dark })).toBe(true);
    expect(intersects(a, { at: [1, 0, 0], size: [1, 1, 1], tone: TONES.dark })).toBe(false);
    expect(intersects(a, { at: [0, 0, 1], size: [1, 1, 1], tone: TONES.dark })).toBe(false);
  });

  test("the viewBox holds every corner", () => {
    const [x, y, w, h] = viewBoxOf([{ at: [0, 0, 0], size: [2, 1, 3], tone: TONES.dark }], [], 0)
      .split(" ")
      .map(Number);
    expect([x, y, w, h]).toEqual([-1, -3, 3, 4.5]);
  });
});
