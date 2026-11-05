import { describe, expect, test } from "bun:test";
import { archetypeIdSchema } from "@wyg/schema";
import { archetypeRole, CAST, CREW } from "./cast";
import { type ChibiMotion, chibiPose } from "./three/pose";

const MOTIONS: ChibiMotion[] = [
  "wave",
  "cheer",
  "run",
  "think",
  "hammer",
  "pass",
  "groove",
  "celebrate",
  "proud",
  "sleep",
];

describe("cast", () => {
  test("the scenes with a guest each have a different character", () => {
    const guests = Object.entries(CAST).filter(([id]) => id !== "intro" && id !== "closing");
    const looks = guests.map(([, role]) => JSON.stringify(role.look));
    expect(new Set(looks).size).toBe(looks.length);
  });

  test("every solo scene has its own motion", () => {
    const motions = Object.values(CAST).map((role) => role.motion);
    expect(new Set(motions).size).toBe(motions.length);
  });

  test("the crew is three different friends", () => {
    expect(new Set(CREW.map((member) => JSON.stringify(member.look))).size).toBe(3);
  });

  test("every archetype dresses Cell differently; no archetype dozes", () => {
    const looks = archetypeIdSchema.options.map((id) => JSON.stringify(archetypeRole(id).look));
    expect(new Set(looks).size).toBe(archetypeIdSchema.options.length);
    expect(archetypeRole(null).motion).toBe("sleep");
  });
});

describe("chibiPose", () => {
  test("is a pure function of time", () => {
    for (const motion of MOTIONS) {
      expect(chibiPose(motion, 1.37, 2)).toEqual(chibiPose(motion, 1.37, 2));
    }
  });

  test("every motion moves its limbs or head over a bar", () => {
    for (const motion of MOTIONS) {
      const poses = [0.1, 0.35, 0.6, 0.85, 1.3, 1.7].map((t) => {
        const p = chibiPose(motion, t);
        return JSON.stringify([p.armL, p.armR, p.legL, p.legR, p.head, p.rootY]);
      });
      expect(new Set(poses).size).toBeGreaterThan(1);
    }
  });

  test("seeds stagger characters that share a motion", () => {
    expect(chibiPose("pass", 1, 1)).not.toEqual(chibiPose("pass", 1, 2));
  });
});
