/*
 * The rail: one gently winding line along the year. A distance along it is `s`; a week is a fixed
 * length; a day's square sits beside the rail in its week; stations stand at even intervals from
 * the first platform to the terminus, on alternating sides, so they never crowd each other
 * whatever dates the year has (spec "Stations").
 */
import type { V3 } from "./project";

/** Rail length of one week. */
export const WEEK = 1.55;
/** Where week 0 begins. */
export const YEAR_START = 14;
/** Where the train waits at hello. */
export const FIRST_PLATFORM = 4;
/** A day's square. */
export const SQUARE = 0.9;
/** Between rows of days. */
export const ROW_PITCH = 1.05;
/** From the rail to the nearest row's centre. */
export const FIRST_ROW = 2.9;
/** From the rail to a plaza's centre. */
export const PLAZA_LATERAL = 8;
export const PLAZA = { long: 9.6, deep: 4.8 };

const SWING = 5;
const WAVE = 64;
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
