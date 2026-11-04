import { describe, expect, test } from "bun:test";
import { type Idle, idleTransform } from "./Accent";

const ALL: Idle[] = [
  "wave",
  "hop",
  "run",
  "think",
  "hammer",
  "float",
  "groove",
  "celebrate",
  "breathe",
];

describe("idleTransform", () => {
  test("is still before the motion fades in", () => {
    for (const idle of ALL) {
      expect(idleTransform(idle, 3.3, 0)).toBe("translate(0%, 0%) rotate(0deg) scale(1, 1)");
    }
  });

  test("is a pure function of the beat", () => {
    for (const idle of ALL) expect(idleTransform(idle, 2.7, 1)).toBe(idleTransform(idle, 2.7, 1));
  });

  test("every motion actually moves", () => {
    for (const idle of ALL) {
      const poses = new Set([0.25, 0.5, 1.25, 2.5, 3.75].map((b) => idleTransform(idle, b, 1)));
      expect(poses.size).toBeGreaterThan(1);
    }
  });

  test("a hop lands on the beat: grounded and squashed", () => {
    expect(idleTransform("hop", 2, 1)).toContain("scale(1.07, 0.91)");
  });
});
