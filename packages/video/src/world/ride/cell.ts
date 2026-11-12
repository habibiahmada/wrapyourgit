/*
 * Cell, drawn live from boxes so it can move: it hops, blinks, waves and cheers. Its face is on
 * its front, a small pack sits on its back (so it reads from behind, where the camera rides), and
 * it wears the crest of three contribution cells, darkest to brightest. Every cycle divides 60
 * frames, so a station's two-second rest loop ends where it began.
 */
import { heat, INK, LIT, TONE } from "./palette";
import { type BoxExtra, part } from "./place";
import type { Decal, Solid } from "./prims";
import type { V3 } from "./project";

export type Mood = "ride" | "idle" | "cheer";

const SIZE = 1.15;
/** Frames in which every one of Cell's cycles repeats. */
const LOOP = 60;
const TAU = Math.PI * 2;

/**
 * Cell standing on `c`, facing `yaw`. `amount` (0 to 1) is how much of the mood shows: at 0 a
 * waving or cheering Cell is in its idle pose, so a mood can ease in and out instead of snapping.
 */
export function cell(c: V3, yaw: number, at: number, mood: Mood, amount = 1): Solid[] {
  const k = SIZE;
  // Every cycle divides LOOP, so fold the frame first: a loop then repeats to the last bit, not
  // just to within rounding.
  const frame = ((at % LOOP) + LOOP) % LOOP;
  const mix = (idle: number, lively: number) =>
    idle + (lively - idle) * Math.max(0, Math.min(1, amount));
  const idleHop = Math.abs(Math.sin((frame / 30) * Math.PI)) * 0.03;
  const hop =
    mood === "cheer"
      ? mix(idleHop, Math.abs(Math.sin((frame / 15) * Math.PI)) * 0.32)
      : mood === "ride"
        ? mix(idleHop, Math.abs(Math.sin((frame / 10) * Math.PI)) * 0.05)
        : idleHop;
  const o: V3 = [c[0], c[1], c[2] + hop];
  const leg = 0.13 * k;
  const p = (dx: number, dy: number, z: number, size: V3, tone = TONE.cell, extra: BoxExtra = {}) =>
    part(o, yaw, dx, dy, z, size, tone, extra);

  // The face, in the front's own units: two eyes with a glint, a mouth that opens for a cheer.
  // Late in the loop, never on its first frames: slides are taken there.
  const blink = frame >= 40 && frame < 44;
  const face: Decal[] = [-1, 1].flatMap((side): Decal[] => {
    const u = 0.5 + side * 0.22;
    return blink
      ? [{ on: "front", rect: [u - 0.09, 0.56, u + 0.09, 0.6], fill: INK }]
      : [
          { on: "front", rect: [u - 0.09, 0.46, u + 0.09, 0.72], fill: INK },
          { on: "front", rect: [u + 0.01, 0.62, u + 0.07, 0.69], fill: "#ffffff" },
        ];
  });
  face.push(
    mood === "cheer" && amount > 0.5
      ? { on: "front", rect: [0.39, 0.16, 0.61, 0.36], fill: INK }
      : { on: "front", rect: [0.39, 0.26, 0.61, 0.31], fill: INK },
  );

  const out: Solid[] = [];
  for (const dy of [-0.16, 0.16]) {
    out.push(p(0, dy * k, 0, [0.16 * k, 0.16 * k, leg], TONE.cellDark, { tag: "cell-foot" }));
  }
  out.push(
    p(0, 0, leg, [0.6 * k, 0.64 * k, 0.62 * k], TONE.cell, {
      tag: "cell-body",
      decals: [...face, { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: "#6ee787" }],
    }),
  );
  out.push(
    p(-0.36 * k, 0, leg + 0.14 * k, [0.14 * k, 0.42 * k, 0.36 * k], TONE.dark, {
      tag: "cell-pack",
      decals: [{ on: "back", rect: [0.15, 0.55, 0.85, 0.75], fill: LIT }],
    }),
  );
  // Arms: low at rest, the left one waving on the ride, both up for a cheer.
  for (const side of [-1, 1]) {
    const lift =
      mood === "cheer"
        ? mix(0.12, 0.62)
        : mood === "ride" && side > 0
          ? mix(0.12, 0.16 + Math.max(0, Math.sin((frame / 30) * TAU)) * 0.42)
          : 0.12;
    out.push(
      p(0, side * 0.38 * k, leg + lift * k, [0.11 * k, 0.11 * k, 0.28 * k], TONE.cell, {
        tag: "cell-arm",
      }),
    );
  }
  // The crest: three cells in a row across the head, with a gap between them so each reads as
  // its own cell from any side. The middle one leads the bounce and the outer two follow
  // together, so the crest stays level left to right.
  [-0.21, 0, 0.21].forEach((dy, i) => {
    const bounce = Math.max(0, Math.sin((frame / 30) * TAU - Math.abs(i - 1) * 0.8)) * 0.06 * k;
    out.push(
      p(0, dy * k, leg + 0.62 * k + bounce, [0.13 * k, 0.13 * k, 0.13 * k], heat(i + 1), {
        tag: "cell-crest",
      }),
    );
  });
  return out;
}
