/*
 * The rail: one winding line along the year. A distance along it is `s`; a week is a fixed
 * length; a day's square sits beside the rail in its week; stations stand at even intervals from
 * the first platform to the terminus, on alternating sides, so they never crowd each other
 * whatever dates the year has (spec "Stations").
 */
import type { V3 } from "./project";

/**
 * Rail length of one week. It sets how far apart the stations stand: with twelve of them the
 * interval is about 12.5, more than a plaza's length, so a station has left the frame before the
 * next one fills it.
 */
export const WEEK = 2.4;
/** Where week 0 begins. */
export const YEAR_START = 14;
/** Where the train waits at hello. */
export const FIRST_PLATFORM = 4;
/** A day's square. */
export const SQUARE = 1.15;
/** Between rows of days. */
export const ROW_PITCH = 1.3;
/** From the rail to the nearest row's centre. */
export const FIRST_ROW = 3.0;
/** From the rail to a plaza's centre. */
export const PLAZA_LATERAL = 9;
/**
 * A plaza's centre is this far along the rail from where the train stops: behind it. The station
 * camera stands behind the train too, over the station before, so once the train has ridden on,
 * every plaza it has left is behind the riding camera, and its hero can be taken down unseen.
 */
export const PLAZA_AHEAD = -4.5;
export const PLAZA = { long: 9.6, deep: 4.8 };

/** How far the rail swings to each side, and the length of one full bend left and right. */
export const SWING = 7;
export const WAVE = 60;
const phase = (s: number) => ((s - FIRST_PLATFORM) / WAVE) * Math.PI * 2;

/** The buffers at the end of the rail, a little after the last week. */
export const railEnd = (weeks: number) => YEAR_START + weeks * WEEK + 6;
/** Where the train waits at closing. */
export const terminus = (weeks: number) => railEnd(weeks) - 4;

export const pathY = (s: number) => SWING * Math.sin(phase(s));
/** Direction of travel at `s`, radians. */
export const heading = (s: number) =>
  Math.atan(((SWING * Math.PI * 2) / WAVE) * Math.cos(phase(s)));

/** A point `lateral` to the right of the rail at distance `s`. */
export function at(s: number, lateral = 0, z = 0): V3 {
  const h = heading(s);
  return [s + Math.sin(h) * lateral, pathY(s) - Math.cos(h) * lateral, z];
}

export const weekS = (col: number) => YEAR_START + col * WEEK;

/** Rows 0 to 2 (Sunday to Tuesday) sit left of the rail, rows 3 to 6 right. */
export function dayPlace(plot: { col: number; row: number }): { s: number; lateral: number } {
  const lateral =
    plot.row < 3
      ? -(FIRST_ROW + (2 - plot.row) * ROW_PITCH)
      : FIRST_ROW + (plot.row - 3) * ROW_PITCH;
  return { s: weekS(plot.col), lateral };
}

/**
 * Station `index` of `count` placed stations: even intervals from the first platform to the
 * terminus. Sides alternate (1 is the right of the rail), so a plaza's nearest neighbour on its
 * own side is two intervals away.
 */
export function stationPlace(
  index: number,
  count: number,
  weeks: number,
): { s: number; side: 1 | -1 } {
  const span = terminus(weeks) - FIRST_PLATFORM;
  const s = count <= 1 ? FIRST_PLATFORM : FIRST_PLATFORM + (index * span) / (count - 1);
  return { s, side: index % 2 === 0 ? -1 : 1 };
}

/**
 * Where the overview camera stands round the middle of the rail, as an angle from the direction
 * of travel. A wide frame looks across the rail, so the year runs the width of the frame; a tall
 * one looks along it from behind the first platform, so the year runs up the frame.
 */
export const OVERVIEW_THETA = {
  landscape: Math.PI * 0.6,
  compact: Math.PI * 0.93,
  portrait: Math.PI * 0.93,
} as const;

/** The overview's billboard: how wide it is, how high it can reach, and how far it keeps from the rail. */
export const BILLBOARD = { wide: 56, top: 43, lateral: 2 * SWING + 12, beyond: 16 };
/** Past the buffers it is the furthest thing from the camera, so it is that much larger to read the same. */
const BILLBOARD_FAR = 1.3;

/**
 * Where the billboard stands for a rail that ends at `end`, turned square to the overview camera
 * so its words run level across the frame, and the corners the camera must keep in frame. It
 * always stands behind the whole year as the camera sees it, never in front of a piece of rail:
 * across the rail from the camera in a wide frame, past the buffers in a tall one.
 */
export function billboardAt(end: number, layout: keyof typeof OVERVIEW_THETA) {
  const middle = (FIRST_PLATFORM + end) / 2;
  // The camera's angle is taken from the x axis, and so is the billboard's place: the rail's
  // own heading swings with its bends and would swing the billboard with it.
  const c: V3 =
    layout === "landscape"
      ? [middle, pathY(middle) - BILLBOARD.lateral, 0]
      : [end + BILLBOARD.beyond, 0, 0];
  const yaw = OVERVIEW_THETA[layout] - Math.PI / 2;
  const scale = layout === "landscape" ? 1 : BILLBOARD_FAR;
  const half = (BILLBOARD.wide * scale) / 2;
  const corners = [-half, half].flatMap((d): V3[] => {
    const x = c[0] + Math.cos(yaw) * d;
    const y = c[1] + Math.sin(yaw) * d;
    return [
      [x, y, 0],
      [x, y, BILLBOARD.top * scale],
    ];
  });
  return { c, yaw, corners, scale };
}
