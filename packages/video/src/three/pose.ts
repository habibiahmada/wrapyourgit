import { C } from "./palette";

/*
 * The pure half of the cast (ChibiCell.tsx draws it): who a character is (`Look`) and the pose of
 * each motion at a time `t`. No three.js here, so it is unit-tested with bun.
 */

export type ChibiMotion =
  | "wave"
  | "cheer"
  | "run"
  | "think"
  | "hammer"
  | "pass"
  | "groove"
  | "celebrate"
  | "proud"
  | "sleep";

export type HeadShape = "squircle" | "wide" | "tall" | "round" | "cube";
export type EyeStyle = "cells" | "dots" | "happy" | "visor" | "sleepy";
export type Top = "sprout" | "antennas" | "ball" | "tufts" | "none";
export type Gear =
  | "headset"
  | "hardhat"
  | "glasses"
  | "sweatband"
  | "scarf"
  | "backpack"
  | "crown"
  | "cap"
  | "hammer";

export type Look = {
  body: string;
  head: HeadShape;
  eyes: EyeStyle;
  top: Top;
  gear?: Gear[];
  /** Face light colour. */
  glow?: string;
  /** Slim legs and a narrower torso. */
  slim?: boolean;
};

/** Cell, the host: green, squircle head, lit-cell eyes and the sprout. */
export const CELL: Look = { body: C.green, head: "squircle", eyes: "cells", top: "sprout" };

export type ChibiPose = {
  rootY: number;
  /** Lean sideways (z) and forward (x), and a turn about the vertical. */
  rootTilt: number;
  rootLean: number;
  rootTurn: number;
  /** Body squash on the beat: 1 = rest. */
  squash: number;
  head: { tilt: number; turn: number; nod: number };
  /** Shoulders: `raise` lifts the arm out to the side (0 down, PI up), `swing` forward (-) or back. */
  armL: { raise: number; swing: number };
  armR: { raise: number; swing: number };
  /** Hip swing forward/back. */
  legL: number;
  legR: number;
  /** 1 open, 0 shut. */
  eyes: number;
  /** Where the eyes look, sideways, in face units. */
  glance: number;
  brows: number;
  /** Open mouth: 0 a smile, 1 wide open. */
  mouth: number;
  /** Sway of whatever sits on the head (it trails the motion). */
  top: number;
};

const TAU = Math.PI * 2;

/** Eyes shut for ~0.12 s every `period` s, offset by `seed`, so a cast never blinks in unison. */
function blink(t: number, seed = 0, period = 2.6): number {
  const local = (t + 0.9 + seed * 0.83) % period;
  return local < 0.12 ? Math.abs(1 - 2 * (local / 0.12)) : 1;
}

const arm = (raise: number, swing = 0) => ({ raise, swing });

/** The pose of `motion` at `t` seconds. `seed` staggers characters that share a motion. */
export function chibiPose(motion: ChibiMotion, t: number, seed = 0): ChibiPose {
  const beat = t * 2 + seed * 0.37;
  const s = (cycles: number, phase = 0) => Math.sin(TAU * beat * cycles + phase);
  const hop = Math.abs(Math.sin(Math.PI * beat));
  const land = (1 - hop) ** 4;
  const base: ChibiPose = {
    rootY: 0,
    rootTilt: 0,
    rootLean: 0,
    rootTurn: 0,
    squash: 1,
    head: { tilt: 0, turn: 0, nod: 0 },
    armL: arm(0.28),
    armR: arm(0.28),
    legL: 0,
    legR: 0,
    eyes: blink(t, seed),
    glance: 0,
    brows: 0.02,
    mouth: 0,
    top: -0.3 * Math.sin(Math.PI * beat - 0.7),
  };
  switch (motion) {
    case "wave":
      return {
        ...base,
        rootY: 0.035 * hop,
        rootTilt: 0.05 * Math.sin(Math.PI * beat),
        squash: 1 - 0.035 * land,
        head: {
          tilt: 0.1 * Math.sin(Math.PI * beat + 0.6),
          turn: 0.12 * s(1 / 8),
          nod: 0.05 * s(1),
        },
        armR: arm(2.45 + 0.42 * s(1)),
        armL: arm(0.28 + 0.08 * Math.sin(Math.PI * beat)),
        legL: 0.14 * Math.sin(Math.PI * beat),
        legR: -0.14 * Math.sin(Math.PI * beat),
        brows: 0.02 + 0.015 * s(1),
      };
    case "cheer":
      // Jumps on every beat with both arms up, shaking them at the top.
      return {
        ...base,
        rootY: 0.16 * hop,
        squash: 1 - 0.09 * land,
        head: { tilt: 0.08 * s(0.5), turn: 0, nod: -0.08 * hop },
        armL: arm(2.65 + 0.25 * s(2), -0.15),
        armR: arm(2.65 + 0.25 * s(2, Math.PI), -0.15),
        legL: -0.25 * hop,
        legR: -0.25 * hop,
        brows: 0.05,
        mouth: 0.6 + 0.4 * hop,
      };
    case "run":
      // Running on the spot: arms pump, knees drive, two bounces per beat, leaning in.
      return {
        ...base,
        rootY: 0.05 * Math.abs(s(1)),
        rootLean: 0.12,
        squash: 1 - 0.03 * (1 - Math.abs(s(1))) ** 4,
        head: { tilt: 0.03 * s(1), turn: 0, nod: -0.1 },
        armL: arm(0.32, 0.95 * s(1)),
        armR: arm(0.32, -0.95 * s(1)),
        legL: -0.75 * s(1),
        legR: 0.75 * s(1),
        top: -0.4 * s(1, -0.7),
      };
    case "think":
      // Hand to chin, head tilted, eyes drifting side to side as it works something out.
      return {
        ...base,
        rootY: 0.02 * Math.sin((TAU * beat) / 4),
        head: { tilt: 0.18 + 0.05 * s(1 / 4), turn: 0.1 * s(1 / 8), nod: 0.06 },
        armR: arm(2.25, -0.95 + 0.06 * s(1)),
        armL: arm(0.3 + 0.05 * s(1 / 4)),
        glance: 0.05 * Math.sign(s(1 / 4)) * Math.min(1, Math.abs(s(1 / 4)) * 4),
        brows: 0.05 + 0.02 * s(1 / 4),
        top: 0.25 * s(1 / 4),
      };
    case "hammer": {
      // The hammer comes down on every beat; the body dips with the blow.
      const p = ((beat % 1) + 1) % 1;
      const swing = p < 0.25 ? -2.6 + 2.2 * (p / 0.25) ** 2 : -0.4 - 2.2 * ((p - 0.25) / 0.75);
      const impact = Math.max(0, 1 - Math.abs(p - 0.25) / 0.12);
      return {
        ...base,
        squash: 1 - 0.07 * impact,
        rootLean: 0.08 * impact,
        head: { tilt: 0.04 * s(0.5), turn: -0.1, nod: 0.12 * impact },
        armR: arm(0.25, swing),
        armL: arm(0.4 + 0.05 * s(1)),
        legL: 0.08,
        legR: -0.08,
        brows: -0.02,
      };
    }
    case "pass":
      // Arms out front ready to catch, bouncing on the beat.
      return {
        ...base,
        rootY: 0.04 * hop,
        squash: 1 - 0.04 * land,
        head: { tilt: 0.06 * s(0.5), turn: 0, nod: 0.08 * s(1) },
        armL: arm(0.5, -1.2 + 0.15 * s(1)),
        armR: arm(0.5, -1.2 + 0.15 * s(1, 0.5)),
        legL: 0.1 * s(0.5),
        legR: -0.1 * s(0.5),
        mouth: 0.3 * hop,
      };
    case "groove":
      // Head nods hard on every beat, shoulders bounce, a sway every two beats.
      return {
        ...base,
        rootY: 0.03 * hop,
        rootTilt: 0.07 * s(0.25),
        squash: 1 - 0.05 * land,
        head: { tilt: 0.1 * s(0.25), turn: 0.08 * s(0.25), nod: 0.16 * land - 0.04 },
        armL: arm(0.5 + 0.2 * hop, -0.4),
        armR: arm(0.5 + 0.2 * hop, -0.4),
        legL: 0.12 * s(0.5),
        legR: -0.12 * s(0.5),
        brows: 0.03 * hop,
      };
    case "celebrate": {
      // A big jump every two beats with a quarter turn, fists pumping in turn.
      const big = Math.abs(Math.sin((Math.PI * beat) / 2));
      return {
        ...base,
        rootY: 0.26 * big,
        rootTurn: 0.35 * Math.sin((Math.PI * beat) / 2),
        squash: 1 - 0.1 * (1 - big) ** 4,
        head: { tilt: 0.1 * s(0.25), turn: 0, nod: -0.1 * big },
        armL: arm(2.4 + 0.5 * Math.max(0, s(1)), -0.2),
        armR: arm(2.4 + 0.5 * Math.max(0, -s(1)), -0.2),
        legL: -0.35 * big,
        legR: -0.15 * big,
        brows: 0.06,
        mouth: 0.4 + 0.6 * big,
      };
    }
    case "proud":
      // Chest out, arms akimbo, a slow confident sway and a nod toward the viewer.
      return {
        ...base,
        rootY: 0.015 * s(0.5),
        rootTilt: 0.04 * s(0.25),
        squash: 1.03 + 0.02 * s(0.5),
        head: { tilt: 0.06 * s(0.25), turn: 0.08 * s(1 / 8), nod: -0.08 + 0.04 * land },
        armL: arm(0.85, 0.35),
        armR: arm(0.85, 0.35),
        brows: 0.04,
      };
    case "sleep":
      // No archetype yet: dozing on its feet, slow breaths, head drooping.
      return {
        ...base,
        rootY: 0.01 * Math.sin((TAU * beat) / 4),
        squash: 1 + 0.03 * Math.sin((TAU * beat) / 4),
        head: { tilt: 0.12, turn: 0, nod: 0.18 + 0.04 * Math.sin((TAU * beat) / 4) },
        armL: arm(0.18),
        armR: arm(0.18),
        eyes: 0.15,
        top: 0.15 * Math.sin((TAU * beat) / 4),
      };
  }
}
