/*
 * What stations share: where a station stands, its paved plaza, and the boards that carry its
 * words. Every number and word in the ride is printed on a solid like these; nothing is laid over
 * the scene (spec "Text").
 */
import type { LayoutFamily, RecapData } from "@wyg/schema";
import type { City } from "../../city";
import { INK, LIT, TONE } from "../palette";
import { part } from "../place";
import type { FaceName, FaceText, Solid } from "../prims";
import type { V3 } from "../project";
import type { RideStop } from "../stops";
import { at, heading, PLAZA, PLAZA_LATERAL } from "../track";

export { part } from "../place";

/** A plaza's centre is this far ahead of where the train stops. */
export const PLAZA_AHEAD = 4.5;
/** The top of a plaza's slab, where heroes stand. */
export const PLAZA_TOP = 0.25;

export type StationContext = {
  data: RecapData;
  city: City;
  stop: RideStop;
  /** The plaza's centre on the ground; for a stop without a plaza, where the train rests. */
  c: V3;
  /** The rail's heading there. */
  yaw: number;
  /** How far the hero has built: 0 before the train nears, 1 from the stop's frame on. */
  build: number;
  /** For idle motion. Everything must repeat every 60 frames at `build` 1. */
  frame: number;
  /** 0 on the ride, 1 at the city overview. */
  overview: number;
  /** The frame's layout family: a narrow frame stacks a hero that a wide one lays in a row. */
  layout: LayoutFamily;
};
export type Station = (ctx: StationContext) => Solid[];

export function stationContext(
  data: RecapData,
  city: City,
  stop: RideStop,
  build: number,
  frame: number,
  overview: number,
  layout: LayoutFamily = "landscape",
): StationContext {
  const s = stop.plaza ? stop.s + PLAZA_AHEAD : stop.s;
  return {
    data,
    city,
    stop,
    c: stop.plaza ? at(s, stop.side * PLAZA_LATERAL) : at(s),
    yaw: heading(s),
    build,
    frame,
    overview,
    layout,
  };
}

/** `text` cut to `max` characters, ending in "…" when it was longer. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * `long` lets a station with a wide hero have a longer plaza.
 */
/** The paved slab with its green rim, a lamp on a bollard at each corner, and a step toward the rail. */
export function plaza(
  ctx: StationContext,
  long: number = PLAZA.long,
  deep: number = PLAZA.deep,
): Solid[] {
  const { c, yaw, stop } = ctx;
  const out: Solid[] = [
    part(c, yaw, 0, 0, 0, [long, deep, PLAZA_TOP], TONE.plaza, {
      tag: "plaza",
      decals: [
        { on: "top", rect: [0.02, 0.04, 0.98, 0.96], fill: "#323b46" },
        { on: "all", rect: [0, 0.7, 1, 1], fill: "#26a641" },
      ],
    }),
    // The rail is on the plaza's left when the plaza is right of the rail, and the other way round.
    part(c, yaw, 0, stop.side * (deep / 2 + 0.4), 0, [3.2, 0.8, 0.12], TONE.plaza, { tag: "step" }),
  ];
  for (const dx of [-(long / 2 - 0.3), long / 2 - 0.3]) {
    for (const dy of [-(deep / 2 - 0.3), deep / 2 - 0.3]) {
      out.push(part(c, yaw, dx, dy, PLAZA_TOP, [0.22, 0.22, 0.5], TONE.dark, { tag: "bollard" }));
      out.push(
        part(c, yaw, dx, dy, PLAZA_TOP + 0.5, [0.26, 0.26, 0.12], TONE.lamp, {
          lit: true,
          edge: false,
          tag: "bollard",
        }),
      );
    }
  }
  return out;
}

export type BoardLine = string | { text: string; tall: number; fill?: string; weight?: number };

const GAP = 0.12;
const MARGIN = 0.16;

/**
 * A board on two posts with `lines` printed on it, top to bottom. "across" stands across the
 * direction of travel and prints on its front and back; "along" runs beside the rail and prints
 * on its two long faces. A plain string's first line is the smaller lead-in. Empty lines are left
 * out.
 */
export function board(
  c: V3,
  yaw: number,
  dx: number,
  dy: number,
  wide: number,
  lines: readonly BoardLine[],
  way: "across" | "along" = "across",
  lift = 1.5,
): Solid[] {
  const rows = lines
    .map((line, i) =>
      typeof line === "string"
        ? {
            text: line,
            tall: i === 0 ? 0.5 : 0.62,
            fill: i === 0 ? "#c9d1d9" : "#ffffff",
            weight: i === 0 ? 700 : 800,
          }
        : { fill: "#ffffff", weight: 800, ...line },
    )
    .filter((row) => row.text !== "");
  const tall =
    MARGIN * 2 + rows.reduce((sum, row) => sum + row.tall, 0) + GAP * Math.max(0, rows.length - 1);
  const faces: FaceName[] = way === "across" ? ["front", "back"] : ["left", "right"];
  let top = MARGIN;
  const texts: FaceText[] = [];
  for (const row of rows) {
    const rect: [number, number, number, number] = [
      0.05,
      1 - (top + row.tall) / tall,
      0.95,
      1 - top / tall,
    ];
    for (const on of faces)
      texts.push({ on, rect, text: row.text, fill: row.fill, weight: row.weight });
    top += row.tall + GAP;
  }
  const thick = Math.max(0.16, wide * 0.012);
  const size: V3 = way === "across" ? [thick, wide, tall] : [wide, thick, tall];
  const post = Math.max(0.14, thick);
  const offsets = [-wide * 0.36, wide * 0.36];
  return [
    ...offsets.map((o) =>
      part(
        c,
        yaw,
        way === "across" ? dx : dx + o,
        way === "across" ? dy + o : dy,
        0,
        [post, post, lift],
        TONE.dark,
        {
          edge: false,
          tag: "board-post",
        },
      ),
    ),
    part(
      c,
      yaw,
      dx,
      dy,
      lift,
      size,
      { top: "#21262d", left: INK, right: INK },
      {
        lit: true,
        tag: "board",
        texts,
        decals: faces.map((on) => ({ on, rect: [0, 0, 1, Math.min(0.08, 0.1 / tall)], fill: LIT })),
      },
    ),
  ];
}

/**
 * A station's name, placed where it hides none of the hero's words and none of them hide it. A
 * wide frame has room beside the hero, so a board stands across the far end of the plaza. A
 * narrow frame has no room to spare beside the hero or above it, so there the name is painted on
 * the plaza's floor in front of the hero, turned to be read from across the rail.
 */
export function nameBoard(
  ctx: StationContext,
  lines: readonly BoardLine[],
  place: { long: number; deep: number; front: number },
): Solid[] {
  const { c, yaw, stop } = ctx;
  if (ctx.layout === "landscape") {
    // Past the far end and a little toward the rail, so the hero's last block does not stand in front of it.
    return board(c, yaw, place.long / 2 + 1.9, stop.side * 1.3, 4.4, lines);
  }
  const rows = lines
    .map((line, i) =>
      typeof line === "string"
        ? {
            text: line,
            tall: i === 0 ? 0.3 : 0.52,
            fill: i === 0 ? "#c9d1d9" : "#ffffff",
            weight: i === 0 ? 700 : 800,
          }
        : { fill: "#c9d1d9", weight: 700, ...line, tall: line.tall * 0.75 },
    )
    .filter((row) => row.text !== "");
  // The strip of floor between the hero and the plaza's edge toward the rail.
  const strip = place.deep / 2 - place.front - 0.15;
  const used = rows.reduce((sum, row) => sum + row.tall, 0) + 0.08 * Math.max(0, rows.length - 1);
  const scale = Math.min(1, strip / used);
  // The camera stands across the rail: on that side the words' tops point away from it.
  const flip = stop.side === 1;
  let from = 0;
  const texts: FaceText[] = rows.map((row) => {
    const tall = (row.tall * scale) / strip;
    const far = from;
    from += tall + (0.08 * scale) / strip;
    // The first line is the furthest from the camera: low v on its side of the plaza, high on the other.
    const rect: [number, number, number, number] = flip
      ? [0.02, far, 0.98, far + tall]
      : [0.02, 1 - far - tall, 0.98, 1 - far];
    return { on: "top", rect, text: row.text, fill: row.fill, weight: row.weight, flip };
  });
  const middle = stop.side * (place.front + 0.05 + strip / 2);
  return [
    part(
      c,
      yaw,
      0,
      middle,
      PLAZA_TOP,
      [place.long - 1.2, strip, 0.012],
      { top: "#323b46", left: "#323b46", right: "#323b46" },
      {
        edge: false,
        tag: "board",
        texts,
      },
    ),
  ];
}
