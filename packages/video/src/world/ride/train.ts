/*
 * The train Cell drives: a small engine and two wagons of green cargo, each turned to its own
 * piece of rail so the train bends with the line. Detail is painted on the faces (a stripe, a
 * headlamp, tail lamps, wheel hubs), not added as more boxes.
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

const HUB: Decal[] = [
  { on: "sides", rect: [0.12, 0.12, 0.88, 0.88], fill: "#8b949e", round: true },
  { on: "sides", rect: [0.36, 0.36, 0.64, 0.64], fill: INK, round: true },
];

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
    e(-0.3, 0, 0.2, [2.5, 1.1, 0.3], TONE.engine, {
      decals: [{ on: "sides", rect: [0, 0.5, 1, 0.78], fill: "#56d364" }],
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
  for (const dx of [-1.1, -0.3, 0.5]) {
    for (const dy of [-0.6, 0.6]) {
      out.push(
        part(c, yaw, dx, dy, 0.02, [0.42, 0.1, 0.42], TONE.ink, { tag: "wheel", decals: HUB }),
      );
    }
  }
  for (const k of [0, 1]) {
    const ws = s - 2.8 - k * 1.5;
    const wc = at(ws);
    const wy = heading(ws);
    out.push(part(wc, wy, 0, 0, 0.2, [1.25, 1.05, 0.26], TONE.dark, { tag: "wagon" }));
    out.push(
      part(wc, wy, 0, 0, 0.46, [1.05, 0.85, 0.36 + k * 0.12], heat(2 + k), {
        tag: "cargo",
        decals: [
          { on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: k ? "#7ee08f" : "#56d364" },
          { on: "all", rect: [0, 0.42, 1, 0.5], fill: "#196c2e" },
        ],
      }),
    );
    for (const dx of [-0.35, 0.35]) {
      for (const dy of [-0.56, 0.56]) {
        out.push(
          part(wc, wy, dx, dy, 0.02, [0.36, 0.1, 0.36], TONE.ink, { tag: "wheel", decals: HUB }),
        );
      }
    }
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
  for (let k = 0; k < 8; k++) {
    const born = Math.floor(frame / 5) * 5 - k * 5;
    const age = (frame - born) / 35;
    if (age < 0 || age > 1) continue;
    const [x, y] = at(trainS + CHIMNEY - age * 35 * speed);
    out.push({
      kind: "ball",
      c: [x, y, 1.6 + age * 2.4],
      r: 0.14 + age * 0.34,
      color: "#b1bac4",
      opacity: (1 - age) * 0.5,
    });
  }
  return out;
}
