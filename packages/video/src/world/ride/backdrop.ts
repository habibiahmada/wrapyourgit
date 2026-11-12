/*
 * The sky, the far skyline and the ground, as primitives painted before the scene. Flat colours
 * only: a star's twinkle is its colour mixed toward the sky, not a see-through square.
 */
import { random } from "remotion";
import type { City } from "../city";
import { bearingX, horizonY, skyline } from "./horizon";
import { CLIFF, GROUND, HAZE, LAND, mixHex, SKY } from "./palette";
import type { Prim } from "./prims";
import { type Frame, NEAR, projector, type RideCamera, type V3 } from "./project";
import { at, railEnd } from "./track";

const STARS = 60;
const MOON_BEARING = 0.5;
const CLOUDS = 16;

const rect = (x: number, y: number, wide: number, tall: number, fill: string): Prim => ({
  kind: "poly",
  pts: [
    [x, y],
    [x + wide, y],
    [x + wide, y + tall],
    [x, y + tall],
  ],
  fill,
  stroke: null,
  depth: 0,
});

export function backdrop(cam: RideCamera, frame: Frame, city: City, frameIndex: number): Prim[] {
  const { focal } = projector(cam, frame);
  const hy = horizonY(cam, frame);
  // Far larger than the frame, so the scene's roll never shows an edge.
  const big = Math.max(frame.width, frame.height) * 2;
  // Twinkles repeat within 60 frames, so a station's rest loop ends where it began.
  const loop = ((frameIndex % 60) + 60) % 60;
  const out: Prim[] = [rect(-big, -big * 4, big * 3, big * 4 + hy, SKY)];
  for (let k = 0; k < STARS; k++) {
    const x = bearingX(random(`star-bearing-${k}`) * Math.PI * 2, cam, frame);
    if (x === null) continue;
    const y = hy - Math.tan(0.05 + random(`star-height-${k}`) * 0.6) * focal;
    const size = k % 5 === 0 ? 5 : 3;
    const period = [10, 12, 15, 20, 30][k % 5] ?? 30;
    const bright = 0.5 + 0.5 * Math.abs(Math.sin((loop / period) * Math.PI + k));
    out.push(rect(x, y, size, size, mixHex(SKY, k % 7 === 0 ? "#7ee08f" : "#c9d1d9", bright)));
  }
  const moonX = bearingX(MOON_BEARING, cam, frame);
  if (moonX !== null) {
    const moonY = hy - Math.tan(0.34) * focal;
    const moonR = focal * 0.045;
    out.push({
      kind: "circle",
      x: moonX,
      y: moonY,
      r: moonR,
      fill: "#d2f5da",
      opacity: 1,
      depth: 0,
    });
    // The sky's colour over most of the disc leaves a crescent.
    out.push({
      kind: "circle",
      x: moonX + moonR * 0.42,
      y: moonY - moonR * 0.2,
      r: moonR * 0.82,
      fill: SKY,
      opacity: 1,
      depth: 0,
    });
  }
  skyline(city).forEach((tower, k) => {
    const x = bearingX(tower.bearing, cam, frame);
    if (x === null) return;
    const wide = focal * 0.042;
    const tall = focal * tower.height;
    out.push(rect(x - wide / 2, hy - tall, wide, tall + 2, k % 3 === 0 ? "#1b2f25" : "#16261e"));
  });
  out.push(rect(-big, hy, big * 3, big * 4, GROUND));
  out.push(rect(-big, hy, big * 3, Math.max(2, focal * 0.012), HAZE));
  // The night goes on under the horizon: the land is an island in it. Stars there too, and
  // clouds drifting below the land's edge, so the sky shows wherever the camera looks past it.
  for (let k = 0; k < STARS; k++) {
    const x = bearingX(random(`deep-bearing-${k}`) * Math.PI * 2, cam, frame);
    if (x === null) continue;
    const y = hy + Math.tan(0.06 + random(`deep-height-${k}`) * 1.1) * focal;
    const size = k % 4 === 0 ? 5 : 3;
    out.push(rect(x, y, size, size, mixHex(GROUND, k % 6 === 0 ? "#7ee08f" : "#c9d1d9", 0.55)));
  }
  for (let k = 0; k < CLOUDS; k++) {
    // Above the horizon for half of them, below it for the rest.
    const lift =
      k % 2 === 0
        ? -(0.05 + random(`cloud-up-${k}`) * 0.22)
        : 0.12 + random(`cloud-down-${k}`) * 0.75;
    const x = bearingX((k / CLOUDS) * Math.PI * 2 + random(`cloud-bearing-${k}`), cam, frame);
    if (x === null) continue;
    const y = hy + Math.tan(lift) * focal;
    const w = focal * (0.1 + random(`cloud-wide-${k}`) * 0.08);
    const h = w * 0.2;
    const tone = lift < 0 ? "#1b2a47" : "#111b30";
    out.push(rect(x - w / 2, y, w, h, tone));
    out.push(rect(x - w * 0.3, y - h * 0.8, w * 0.5, h, tone));
    out.push(rect(x - w * 0.05, y - h * 1.5, w * 0.28, h * 0.9, tone));
  }
  out.push(...island(cam, frame, city));
  return out;
}

/** The side of a plot of land, and how far the land reaches from the rail. */
const PLOT = 12;
const REACH = 27;
/** How thick the island is at its edge. */
const THICK = 2.4;

/** The plots of land the year stands on: every one whose middle is within reach of the rail. */
function plots(weeks: number): Set<string> {
  const kept = lands.get(weeks);
  if (kept) return kept;
  const found = new Set<string>();
  const span = Math.ceil(REACH / PLOT);
  for (let s = -6; s <= railEnd(weeks) + 6; s += 3) {
    const [x, y] = at(s, 0);
    const ci = Math.floor(x / PLOT);
    const cj = Math.floor(y / PLOT);
    for (let i = ci - span; i <= ci + span; i++) {
      for (let j = cj - span; j <= cj + span; j++) {
        if (Math.hypot((i + 0.5) * PLOT - x, (j + 0.5) * PLOT - y) <= REACH) found.add(`${i},${j}`);
      }
    }
  }
  lands.set(weeks, found);
  return found;
}
const lands = new Map<number, Set<string>>();

/**
 * The land as flat primitives: its sides first, then its plots in a checker of two tones, so a
 * far side is covered by the plots in front of it. A plot is cut at the lens instead of dropped:
 * the camera rides low over the one it is on.
 */
function island(cam: RideCamera, frame: Frame, city: City): Prim[] {
  const lens = projector(cam, frame);
  const weeks = Math.max(...city.plots.map((plot) => plot.col)) + 1;
  const land = plots(weeks);
  const sides: Prim[] = [];
  const tops: Prim[] = [];
  /** A polygon of world points, cut where it passes behind the lens, as a primitive. */
  const poly = (world: V3[], fill: string): Prim | null => {
    const seen = world.map(lens.toCamera);
    const cut: V3[] = [];
    seen.forEach((a, k) => {
      const b = seen[(k + 1) % seen.length] ?? a;
      if (a[2] >= NEAR) cut.push(a);
      if (a[2] >= NEAR !== b[2] >= NEAR) {
        const t = (NEAR - a[2]) / (b[2] - a[2]);
        cut.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
      }
    });
    if (cut.length < 3) return null;
    const pts = cut.map(lens.toScreen);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    if (Math.max(...xs) < 0 || Math.min(...xs) > frame.width) return null;
    if (Math.max(...ys) < 0 || Math.min(...ys) > frame.height) return null;
    return { kind: "poly", pts, fill, stroke: null, depth: 0 };
  };
  for (const key of land) {
    const [i = 0, j = 0] = key.split(",").map(Number);
    const x0 = i * PLOT;
    const y0 = j * PLOT;
    const x1 = x0 + PLOT;
    const y1 = y0 + PLOT;
    const top = poly(
      [
        [x0, y0, -0.02],
        [x1, y0, -0.02],
        [x1, y1, -0.02],
        [x0, y1, -0.02],
      ],
      LAND[(((i + j) % 2) + 2) % 2] ?? LAND[0],
    );
    if (top) tops.push(top);
    // A side wherever the next plot over is not land, with a lit line along its top.
    const edges: [string, V3, V3][] = [
      [`${i - 1},${j}`, [x0, y0, 0], [x0, y1, 0]],
      [`${i + 1},${j}`, [x1, y0, 0], [x1, y1, 0]],
      [`${i},${j - 1}`, [x0, y0, 0], [x1, y0, 0]],
      [`${i},${j + 1}`, [x0, y1, 0], [x1, y1, 0]],
    ];
    for (const [next, a, b] of edges) {
      if (land.has(next)) continue;
      const wall = poly(
        [
          [a[0], a[1], -0.02],
          [b[0], b[1], -0.02],
          [b[0], b[1], -THICK],
          [a[0], a[1], -THICK],
        ],
        CLIFF,
      );
      const rim = poly(
        [
          [a[0], a[1], -0.02],
          [b[0], b[1], -0.02],
          [b[0], b[1], -0.2],
          [a[0], a[1], -0.2],
        ],
        "#26a641",
      );
      if (wall) sides.push(wall);
      if (rim) sides.push(rim);
    }
  }
  return [...sides, ...tops];
}
