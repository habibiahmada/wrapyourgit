/*
 * The rail: one line along the year that doubles back on itself in wide turns. A distance along it is `s`; a week is a fixed
 * length; a day's square sits beside the rail in its week; stations stand at even intervals from
 * the first platform, with extra room before the terminus, on alternating sides, so they never crowd each other
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

/**
 * The rail's shape: a straight run, a half-circle back the other way, a straight run, a half-circle
 * back again, and so on, like a snake. Each half-circle turns the train right round, so the year
 * folds into a block of ground instead of one long line, and the overview can show all of it large.
 * The radius is wide enough that the day squares on the inside of a turn still stand apart.
 */
export const RUN = 16;
export const TURN = 16;
const ARC = Math.PI * TURN;
const LAP = 2 * (RUN + ARC);

/** The rail's centre line at `s`: where it is, and the direction of travel (radians, continuous). */
function centre(s: number): { x: number; y: number; h: number } {
  // Before the first platform the rail runs straight back, so a camera behind the train has ground.
  if (s < 0) return { x: s, y: 0, h: 0 };
  const lap = Math.floor(s / LAP);
  const u = s - lap * LAP;
  const y0 = lap * 4 * TURN;
  if (u < RUN) return { x: u, y: y0, h: 0 };
  if (u < RUN + ARC) {
    // Round to the left: the heading goes from 0 to a half turn.
    const h = (u - RUN) / TURN;
    return { x: RUN + TURN * Math.sin(h), y: y0 + TURN - TURN * Math.cos(h), h };
  }
  if (u < 2 * RUN + ARC) return { x: RUN - (u - RUN - ARC), y: y0 + 2 * TURN, h: Math.PI };
  // Round to the right: the heading comes back from a half turn to 0.
  const h = Math.PI - (u - 2 * RUN - ARC) / TURN;
  return { x: -TURN * Math.sin(h), y: y0 + 3 * TURN + TURN * Math.cos(h), h };
}

/** Which way the rail is turning at `s`: 1 round to the left, -1 round to the right, 0 on a straight run. */
export function turning(s: number): 1 | -1 | 0 {
  if (s < 0) return 0;
  const u = s % LAP;
  if (u < RUN) return 0;
  if (u < RUN + ARC) return 1;
  if (u < 2 * RUN + ARC) return 0;
  return -1;
}

/** The buffers at the end of the rail, a little after the last week. */
export const railEnd = (weeks: number) => YEAR_START + weeks * WEEK + 6;
/** Where the train waits at closing. */
export const terminus = (weeks: number) => railEnd(weeks) - 4;

/** Direction of travel at `s`, radians. */
export const heading = (s: number) => centre(s).h;

/** A point `lateral` to the right of the rail at distance `s`. */
export function at(s: number, lateral = 0, z = 0): V3 {
  const { x, y, h } = centre(s);
  return [x + Math.sin(h) * lateral, y - Math.cos(h) * lateral, z];
}

/** The ground the rail and what stands beside it cover, from the first platform to `end`. */
export function railBounds(end: number): { min: [number, number]; max: [number, number] } {
  const kept = bounds.get(end);
  if (kept) return kept;
  const found = measureBounds(end);
  bounds.set(end, found);
  return found;
}
const bounds = new Map<number, { min: [number, number]; max: [number, number] }>();

function measureBounds(end: number): { min: [number, number]; max: [number, number] } {
  const min: [number, number] = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max: [number, number] = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let s = 0; s <= end; s += 2) {
    for (const lateral of [-BESIDE, BESIDE]) {
      const [x, y] = at(s, lateral);
      min[0] = Math.min(min[0], x);
      min[1] = Math.min(min[1], y);
      max[0] = Math.max(max[0], x);
      max[1] = Math.max(max[1], y);
    }
  }
  return { min, max };
}
/** How far to each side of the rail the squares and plazas reach. */
const BESIDE = 12;

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
 * Extra rail before the terminus: the closing party's plaza runs back along the rail, and the
 * station before must stand clear of it.
 */
export const CLOSING_ROOM = 10;

/**
 * Station `index` of `count` placed stations: even intervals from the first platform, and the
 * terminus CLOSING_ROOM further on. On a straight run sides alternate (1 is the right of the
 * rail), so a plaza's nearest neighbour on its own side is two intervals away; on a turn every
 * plaza is on the outside.
 */
export function stationPlace(
  index: number,
  count: number,
  weeks: number,
): { s: number; side: 1 | -1 } {
  const span = terminus(weeks) - FIRST_PLATFORM;
  // The terminus keeps CLOSING_ROOM to itself before it; the others share the rest evenly.
  const step = count <= 1 ? 0 : (span - CLOSING_ROOM) / (count - 1);
  const s =
    count <= 1
      ? FIRST_PLATFORM
      : index >= count - 1
        ? terminus(weeks)
        : FIRST_PLATFORM + index * step;
  // On a turn the plaza stands outside it: inside, the rail runs all the way round and two
  // plazas would share the little ground in the middle.
  const turn = turning(s + PLAZA_AHEAD) || turning(s);
  return { s, side: turn !== 0 ? turn : index % 2 === 0 ? -1 : 1 };
}

/**
 * Where the overview camera stands round the middle of the year's ground, as an angle from the
 * x axis. The ground is longer across the runs than along them: a wide frame looks along the
 * runs, so the long side fills its width; a tall one looks across them, so it runs up the frame.
 */
export const OVERVIEW_THETA = {
  landscape: Math.PI,
  compact: -Math.PI / 2,
  portrait: -Math.PI / 2,
} as const;

/** The overview's billboard: how wide it is, how high it can reach, and how far behind the year it stands. */
export const BILLBOARD = { wide: 44, top: 36, behind: 10 };

/**
 * Where the billboard stands for a rail that ends at `end`: behind the year's ground as the
 * overview camera sees it, never in front of a piece of rail, and turned square to the camera so
 * its words run level across the frame. `corners` are what the camera must keep in frame.
 */
export function billboardAt(end: number, layout: keyof typeof OVERVIEW_THETA) {
  const { min, max } = railBounds(end);
  const theta = OVERVIEW_THETA[layout];
  const mid: [number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2];
  // Half the ground's depth along the camera's line of sight, then the gap behind it.
  const reach =
    Math.abs(Math.cos(theta)) * (max[0] - min[0]) * 0.5 +
    Math.abs(Math.sin(theta)) * (max[1] - min[1]) * 0.5 +
    BILLBOARD.behind;
  const c: V3 = [mid[0] - Math.cos(theta) * reach, mid[1] - Math.sin(theta) * reach, 0];
  const yaw = theta - Math.PI / 2;
  const half = BILLBOARD.wide / 2;
  const corners = [-half, half].flatMap((d): V3[] => {
    const x = c[0] + Math.cos(yaw) * d;
    const y = c[1] + Math.sin(yaw) * d;
    return [
      [x, y, 0],
      [x, y, BILLBOARD.top],
    ];
  });
  return { c, yaw, corners, scale: 1 };
}
