/*
 * The train Cell drives: a small engine and two wagons of green cargo, each turned to its own
 * piece of rail so the train bends with the line. Detail is painted on the faces (a stripe, a
 * headlamp, tail lamps, the wheels), not added as more boxes.
 */
import { heat, INK, TONE } from "./palette";
import { type BoxExtra, part } from "./place";
import type { Decal, Solid } from "./prims";
import type { V3 } from "./project";
import { at, heading } from "./track";

/** Where Cell sits on the engine, from its nose. */
export const CELL_SEAT = -0.35;
/** The chimney, from the nose. */
const CHIMNEY = 0.62;

/** A wheel's size, the same on the engine and the wagons, and the skirt it is painted on. */
const WHEEL = 0.36;
const SKIRT = 0.38;
const SKIRT_FILL = "#161b22";

/**
 * The lower side of a body `long` by `tall` that stands on the rail: a dark skirt with a wheel
 * painted at each of `axles` (distances from the body's middle). The wheels are paint on the
 * body's own sides, like every other detail of the train. As boxes of their own they were sorted
 * against the body face by face, and from some angles the body was painted over half a wheel, so
 * one wheel of a pair looked whole and the other cut.
 */
function running(long: number, tall: number, axles: readonly number[]): Decal[] {
  const v = (z: number) => z / tall;
  const out: Decal[] = [{ on: "all", rect: [0, 0, 1, v(SKIRT)], fill: SKIRT_FILL }];
  for (const axle of axles) {
    const u = 0.5 + axle / long;
    const disc = (share: number, fill: string): Decal => ({
      on: "sides",
      rect: [
        u - ((WHEEL / 2) * share) / long,
        v(WHEEL / 2 - (WHEEL / 2) * share),
        u + ((WHEEL / 2) * share) / long,
        v(WHEEL / 2 + (WHEEL / 2) * share),
      ],
      fill,
      round: true,
    });
    out.push(disc(1, INK), disc(0.78, "#8b949e"), disc(0.3, INK));
  }
  return out;
}

/** The engine with its nose at `s`, and two wagons behind it. */
export function train(s: number): Solid[] {
  const c = at(s);
  const yaw = heading(s);
  const e = (
    dx: number,
    dy: number,
    z: number,
    size: V3,
    tone = TONE.engine,
    extra: BoxExtra = {},
  ) => part(c, yaw, dx, dy, z, size, tone, { tag: "engine", ...extra });
  const out: Solid[] = [
    // The frame stands on the rail: its lower part is the skirt with the wheels, three axles
    // evenly spaced with the same overhang at each end, and a bright stripe above them.
    e(-0.3, 0, 0.02, [2.5, 1.1, 0.48], TONE.engine, {
      tag: "frame",
      decals: [
        ...running(2.5, 0.48, [-0.78, 0, 0.78]),
        { on: "sides", rect: [0, 0.84, 1, 0.94], fill: "#56d364" },
      ],
    }),
    e(1.0, 0, 0.2, [0.1, 1.24, 0.16], TONE.mid),
    e(0.45, 0, 0.5, [1.0, 0.8, 0.44], TONE.engineDark, {
      decals: [
        { on: "sides", rect: [0.82, 0, 1, 1], fill: "#2ea043" },
        { on: "front", rect: [0.3, 0.2, 0.7, 0.8], fill: "#ffd866", round: true },
        { on: "top", rect: [0.08, 0.2, 0.5, 0.8], fill: "#1f8a3a" },
      ],
    }),
    e(CHIMNEY, 0, 0.94, [0.24, 0.24, 0.44], TONE.dark),
    e(CHIMNEY, 0, 1.38, [0.34, 0.34, 0.08], TONE.mid),
    // A low bunker, so Cell shows over it from behind.
    e(-1.22, 0, 0.5, [0.62, 1.0, 0.3], TONE.dark, {
      decals: [
        { on: "back", rect: [0.08, 0.25, 0.26, 0.75], fill: "#ffd866" },
        { on: "back", rect: [0.74, 0.25, 0.92, 0.75], fill: "#ffd866" },
        { on: "top", rect: [0.12, 0.1, 0.88, 0.9], fill: "#161b22" },
      ],
    }),
  ];
  for (const k of [0, 1]) {
    const ws = s - 2.8 - k * 1.5;
    const wc = at(ws);
    const wy = heading(ws);
    out.push(
      part(wc, wy, 0, 0, 0.02, [1.25, 1.05, 0.44], TONE.dark, {
        tag: "wagon",
        decals: running(1.25, 0.44, [-0.34, 0.34]),
      }),
    );
    out.push(
      part(wc, wy, 0, 0, 0.46, [1.05, 0.85, 0.36 + k * 0.12], heat(2 + k), {
        tag: "cargo",
        decals: [
          { on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: k ? "#7ee08f" : "#56d364" },
          { on: "all", rect: [0, 0.42, 1, 0.5], fill: "#196c2e" },
        ],
      }),
    );
  }
  return out;
}

/**
 * Smoke from the chimney: a puff every 5 frames that rises and fades over 35. The faster the
 * train goes, the further back along the rail an older puff has fallen; at rest every puff stands
 * over the chimney, so a station's rest loop repeats exactly.
 */
export function smoke(frame: number, trainS: number, speed: number): Solid[] {
  const out: Solid[] = [];
  const moving = Math.min(1, speed * 8);
  for (let k = 0; k < 8; k++) {
    const born = Math.floor(frame / 5) * 5 - k * 5;
    const age = (frame - born) / 35;
    if (age < 0 || age > 1) continue;
    const [x, y] = at(trainS + CHIMNEY - age * 35 * speed);
    out.push({
      kind: "ball",
      // At rest the column is short and faint: a tall one stood in front of the station's sign
      // for the whole stop. On the move it streams back, where it covers nothing.
      c: [x, y, 1.6 + age * (1.2 + moving * 1.2)],
      r: 0.14 + age * (0.22 + moving * 0.12),
      color: "#b1bac4",
      opacity: (1 - age) * (0.32 + moving * 0.18),
    });
  }
  return out;
}
