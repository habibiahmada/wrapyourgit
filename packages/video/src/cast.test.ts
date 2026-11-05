import { describe, expect, test } from "bun:test";
import { archetypeIdSchema } from "@wyg/schema";
import { ARCHETYPE_COLORS, archetypeRole, CAST } from "./cast";
import { CELL, type ChibiMotion, chibiPose, LOOP_SECONDS } from "./three/pose";

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
  test("Cell hosts every scene: one mascot, green throughout", () => {
    for (const role of Object.values(CAST)) {
      expect(role.look.body).toBe(CELL.body);
      expect(role.look.head).toBe(CELL.head);
    }
  });

  test("every scene has its own motion", () => {
    const roles = Object.values(CAST);
    expect(new Set(roles.map((role) => role.motion)).size).toBe(roles.length);
  });

  test("every archetype has its own colour, pose and photo; no archetype dozes", () => {
    const ids = archetypeIdSchema.options;
    const roles = ids.map((id) => archetypeRole(id));
    expect(new Set(ids.map((id) => ARCHETYPE_COLORS[id])).size).toBe(ids.length);
    expect(new Set(roles.map((role) => role.motion)).size).toBe(ids.length);
    expect(new Set(roles.map((role) => role.photo)).size).toBe(ids.length);
    for (const id of ids) expect(archetypeRole(id).look.body).toBe(ARCHETYPE_COLORS[id]);
    expect(archetypeRole(null).motion).toBe("sleep");
  });
});

describe("chibiPose", () => {
  test("repeats exactly every loop, so baked animations loop without a jump", () => {
    for (const motion of MOTIONS) {
      for (const t of [0, 0.37, 1.1, 1.93]) {
        const flat = (pose: object): number[] =>
          Object.values(pose).flatMap((v) => (typeof v === "number" ? [v] : flat(v)));
        const a = flat(chibiPose(motion, t, 1));
        const b = flat(chibiPose(motion, t + LOOP_SECONDS, 1));
        a.forEach((value, i) => {
          expect(b[i] ?? Number.NaN).toBeCloseTo(value, 6);
        });
      }
    }
  });

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
