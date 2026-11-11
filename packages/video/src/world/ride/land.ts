/*
 * The land the train crosses: the year's squares on both sides of the rail, the rail itself, a
 * gate for every month, lamps and trees beyond the squares, and a beacon on the first and the
 * busiest day. Only what lies inside the view is built.
 */
import { random } from "remotion";
import { heatLevels } from "../../heat";
import type { City } from "../city";
import type { Gate } from "./gates.model";
import { heat, LIT, mixHex, TONE } from "./palette";
import { part, railBox } from "./place";
import type { FaceText, Solid } from "./prims";
import type { RideStop } from "./stops";
import { at, dayPlace, FIRST_ROW, ROW_PITCH, railEnd, SQUARE, weekS } from "./track";

/** A day lights when the train is this close behind it. */
export const LIGHT_AHEAD = 15;
/** A plaza's centre is this far ahead of where the train stops. */
const PLAZA_AHEAD = 4.5;
/** Gates and props keep this far from a plaza, so nothing stands between the camera and a hero. */
const CLEAR = 8;
/** A gate this far behind where the train rests is in the station camera's foreground. */
const BEHIND = 12;
/** And one this far ahead is at the edge of its picture. */
const AHEAD = 18;
const SLEEPER = 0.7;

export type View = {
  trainS: number;
  /** Only what lies between these distances along the rail is built. */
  from: number;
  to: number;
  /** 0 on the ride; 1 at the overview, where every day with data is lit and small things are left out. */
  overview: number;
};
export type Land = { ground: Solid[]; objects: Solid[] };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function land(
  city: City,
  gates: readonly Gate[],
  stops: readonly RideStop[],
  view: View,
): Land {
  const ground: Solid[] = [];
  const objects: Solid[] = [];
  const weeks = Math.max(...city.plots.map((plot) => plot.col)) + 1;
  const end = railEnd(weeks);
  const inView = (s: number) => s >= view.from && s <= view.to;
  const plazas = stops.filter((stop) => stop.plaza).map((stop) => stop.s + PLAZA_AHEAD);
  const byPlaza = (s: number) => plazas.some((p) => Math.abs(s - p) < CLEAR);
  const far = view.overview > 0.5;

  // The year: one square per day.
  const levels = heatLevels(city.plots);
  for (const plot of city.plots) {
    const { s, lateral } = dayPlace(plot);
    if (!inView(s)) continue;
    if (plot.state === "not-yet") {
      // An outline, never a dim square: a day that has not happened is not a day with zero.
      ground.push(
        railBox(s, lateral, 0, [SQUARE, SQUARE, 0.04], TONE.dim, { outline: true, tag: "day" }),
      );
      continue;
    }
    const level = levels[plot.index] ?? 0;
    const riding = clamp01((view.trainS + LIGHT_AHEAD - s) / 2.5);
    const lit = riding + (1 - riding) * clamp01(view.overview);
    if (plot.state !== "active" || level === 0 || lit <= 0) {
      ground.push(
        railBox(s, lateral, 0, [SQUARE, SQUARE, 0.04], TONE.dim, { edge: false, tag: "day" }),
      );
      continue;
    }
    const tone = heat(level - 1);
    ground.push(
      railBox(s, lateral, 0, [SQUARE, SQUARE, 0.05 + lit * level * 0.06], tone, {
        tag: "day",
        decals: [
          { on: "top", rect: [0.16, 0.16, 0.84, 0.84], fill: mixHex(tone.top, "#ffffff", 0.16) },
        ],
      }),
    );
  }

  // The rail on its ballast. From far away the sleepers go and the rails are long strips.
  const piece = far ? 4 : SLEEPER;
  const first = Math.max(0, Math.floor(view.from / piece) * piece);
  for (let s = first; s <= Math.min(view.to, end); s += piece) {
    const mid = s + piece / 2;
    ground.push(
      railBox(mid, 0, 0, [piece + 0.02, 2.3, 0.02], TONE.gravel, { edge: false, tag: "ballast" }),
    );
    if (!far)
      ground.push(
        railBox(s, 0, 0.02, [0.22, 1.5, 0.05], TONE.soil, { edge: false, tag: "sleeper" }),
      );
    for (const lateral of [-0.5, 0.5]) {
      ground.push(
        railBox(mid, lateral, 0.07, [piece + 0.02, 0.08, 0.08], TONE.rail, {
          edge: false,
          tag: "rail",
        }),
      );
    }
  }

  // A gate per month, with its name and the contributions made before it on the sign.
  for (const gate of gates) {
    const s = weekS(gate.col) - 0.8;
    // No gate where a train at rest would stand under it, or pull away under one still rising.
    const atStation = stops.some((stop) => stop.plaza && s > stop.s - 1 && s < stop.s + 3.5);
    if (!inView(s) || atStation) continue;
    // A gate just behind a station stands in the station camera's foreground, and one a little
    // way ahead at the edge of its picture. Each folds down as the train pulls in and rises again
    // as it leaves; one behind waits until the train has passed under it.
    const up = Math.min(
      1,
      ...stops
        .filter(
          (stop) =>
            stop.plaza &&
            (s < stop.s ? s >= stop.s - BEHIND && view.trainS >= s : s <= stop.s + AHEAD),
        )
        .map((stop) => Math.max(0, (Math.abs(view.trainS - stop.s) - 1) / 2.5)),
    );
    if (up < 0.1) continue;
    const tall = 3.3 * up;
    for (const lateral of [-2.1, 2.1]) {
      objects.push(railBox(s, lateral, 0, [0.5, 0.5, 0.3], TONE.mid, { tag: "gate-post" }));
      objects.push(
        railBox(s, lateral, 0.3, [0.28, 0.28, tall], TONE.dark, {
          tag: "gate-post",
          decals: [{ on: "all", rect: [0, 0.86, 1, 0.94], fill: LIT }],
        }),
      );
    }
    objects.push(
      railBox(
        s,
        0,
        0.3 + tall,
        [0.32, 4.6, 0.3],
        { top: "#56e070", left: LIT, right: "#26a641" },
        { lit: true, tag: "gate-beam" },
      ),
    );
    // The sign is taken down first: a folding gate carries no words.
    if (up < 1) continue;
    const texts: FaceText[] = (["front", "back"] as const).flatMap((on): FaceText[] =>
      gate.line
        ? [
            { on, rect: [0.06, 0.54, 0.94, 0.94], text: gate.name, fill: "#ffffff" },
            // As tall as the month: the total is what the sign is for.
            { on, rect: [0.04, 0.06, 0.96, 0.5], text: gate.line, fill: "#7ee08f" },
          ]
        : [{ on, rect: [0.08, 0.2, 0.92, 0.8], text: gate.name, fill: "#ffffff" }],
    );
    objects.push(
      // Large enough to read from several squares away, so it is in view for longer.
      railBox(s, 0, 3.9, [0.14, 3.4, 1.6], TONE.ink, { lit: true, tag: "gate-sign", texts }),
    );
  }

  // Lamps, trees, rocks and bushes beyond the squares: the land around the line.
  if (!far) {
    const outer = FIRST_ROW + 3 * ROW_PITCH + SQUARE;
    for (let k = Math.max(0, Math.ceil(view.from / 4.5)); k * 4.5 <= Math.min(view.to, end); k++) {
      const s = k * 4.5;
      if (byPlaza(s)) continue;
      for (const side of [-1, 1] as const) {
        if (k % 2 === 0 && side === (k % 4 === 0 ? 1 : -1)) {
          const c = at(s, side * (outer + 0.7));
          objects.push(
            part(c, 0, 0, 0, 0, [0.34, 0.34, 0.14], TONE.mid, { edge: false, tag: "prop" }),
          );
          objects.push(
            part(c, 0, 0, 0, 0.14, [0.12, 0.12, 2.3], TONE.dark, { edge: false, tag: "prop" }),
          );
          objects.push(
            part(c, 0, 0, 0, 2.44, [0.36, 0.36, 0.24], TONE.lamp, { lit: true, tag: "prop" }),
          );
        }
        const kind = random(`prop-${k}-${side}`);
        const c = at(s, side * (outer + 1.6 + random(`prop-lat-${k}-${side}`) * 5));
        const size = 0.8 + random(`prop-size-${k}-${side}`) * 0.5;
        if (kind < 0.5) {
          objects.push(
            part(c, 0, 0, 0, 0, [0.24 * size, 0.24 * size, 0.8 * size], TONE.wood, {
              edge: false,
              tag: "prop",
            }),
          );
          objects.push(
            part(c, 0, 0, 0, 0.8 * size, [1.2 * size, 1.2 * size, 0.85 * size], TONE.leaf, {
              tag: "prop",
              decals: [{ on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: TONE.leafTop.left }],
            }),
          );
          objects.push(
            part(c, 0, 0, 0, 1.65 * size, [0.75 * size, 0.75 * size, 0.6 * size], TONE.leafTop, {
              tag: "prop",
            }),
          );
        } else if (kind < 0.75) {
          objects.push(part(c, kind * 6, 0, 0, 0, [0.7, 0.5, 0.32], TONE.rock, { tag: "prop" }));
        } else {
          objects.push(
            part(c, 0, 0, 0, 0, [0.8, 0.8, 0.42], TONE.leaf, {
              tag: "prop",
              decals: [{ on: "top", rect: [0.15, 0.15, 0.85, 0.85], fill: TONE.leafTop.left }],
            }),
          );
        }
      }
    }
  }

  // A beacon on the first active day and on the busiest day: real dates, marked where they are.
  for (const index of new Set([city.firstActiveIndex, city.busiestIndex])) {
    const plot = index === null ? undefined : city.plots[index];
    if (!plot) continue;
    const { s, lateral } = dayPlace(plot);
    if (!inView(s)) continue;
    objects.push(
      railBox(s, lateral, 0.3, [0.12, 0.12, 3], TONE.lamp, {
        lit: true,
        edge: false,
        tag: "beacon",
      }),
    );
    objects.push(
      railBox(s, lateral, 3.3, [0.34, 0.34, 0.34], TONE.lamp, { lit: true, tag: "beacon-cap" }),
    );
  }

  return { ground, objects };
}
