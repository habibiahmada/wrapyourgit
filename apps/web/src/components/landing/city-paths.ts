import type { RecapData } from "@wyg/schema";
import { buildCity, cityBounds, isoPoint, plotHeight, TILE_H, TILE_W } from "@wyg/video/city";
import { heatLevels } from "@wyg/video/heat";

/** GitHub's dark contribution greens, levels 1-4 (DESIGN.md "Web"). */
const GREENS = ["#0e4429", "#006d32", "#26a641", "#39d353"] as const;
const CANVAS = "#0d1117";
/** Share of a tile a building covers, so neighbouring days read as separate blocks. */
const FOOTPRINT = 0.84;
/** Room above the city for the glow and Cell on the busiest roof, in tile units. */
const HEADROOM = 3.2;
const MARGIN = 0.6;

export type Building = {
  date: string;
  /** Path data of the roof, the left face and the right face. */
  roof: string;
  left: string;
  right: string;
  /** Roof colour and the two darker side colours. */
  top: string;
  leftFill: string;
  rightFill: string;
  height: number;
  /** Centre of the roof, in viewBox units. */
  roofY: number;
};

export type CityPaths = {
  viewBox: string;
  /** Every day's tile outline at ground level: the calendar grid the city stands on. */
  ground: string;
  /**
   * Active days, one group per week in column order. Painting week by week, rows in order,
   * is a correct back-to-front order here: days drawn out of depth order sit too far apart
   * sideways to overlap.
   */
  weeks: { col: number; buildings: Building[] }[];
  busiest: { x: number; y: number } | null;
};

/** Linear mix of two #RRGGBB colours, `t` of the way from `a` to `b`. */
function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  const out = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const n = (value: number) => Number(value.toFixed(3));
const poly = (points: [number, number][]) =>
  `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;

/** The hero's city: the year's contribution graph as isometric buildings, as SVG path data. */
export function cityPaths(data: RecapData): CityPaths {
  const city = buildCity(data);
  const levels = heatLevels(city.plots);
  const w = TILE_W * FOOTPRINT;
  const h = TILE_H * FOOTPRINT;

  const ground: string[] = [];
  const weeks = new Map<number, Building[]>();
  let busiest: CityPaths["busiest"] = null;

  const ordered = [...city.plots].sort((a, b) => a.col - b.col || a.row - b.row);
  for (const plot of ordered) {
    const { x, y } = isoPoint(plot.col, plot.row);
    ground.push(
      poly([
        [x, y - h],
        [x + w, y],
        [x, y + h],
        [x - w, y],
      ]),
    );
    if (plot.state !== "active") continue;

    const lift = plotHeight(plot, city.maxCount);
    const top = GREENS[(levels[plot.index] ?? 1) - 1] ?? GREENS[0];
    const building: Building = {
      date: plot.date,
      roof: poly([
        [x - w, y - lift],
        [x, y - h - lift],
        [x + w, y - lift],
        [x, y + h - lift],
      ]),
      left: poly([
        [x - w, y - lift],
        [x, y + h - lift],
        [x, y + h],
        [x - w, y],
      ]),
      right: poly([
        [x, y + h - lift],
        [x + w, y - lift],
        [x + w, y],
        [x, y + h],
      ]),
      top,
      leftFill: mix(top, CANVAS, 0.4),
      rightFill: mix(top, CANVAS, 0.6),
      height: lift,
      roofY: n(y - lift),
    };
    if (plot.index === city.busiestIndex) busiest = { x: n(x), y: building.roofY };
    weeks.set(plot.col, [...(weeks.get(plot.col) ?? []), building]);
  }

  const box = cityBounds(city);
  const minX = box.minX - MARGIN;
  const minY = box.minY - HEADROOM;
  const width = box.maxX - box.minX + 2 * MARGIN;
  const height = box.maxY - box.minY + HEADROOM + MARGIN;

  return {
    viewBox: `${n(minX)} ${n(minY)} ${n(width)} ${n(height)}`,
    ground: ground.join(""),
    weeks: [...weeks].map(([col, buildings]) => ({ col, buildings })),
    busiest,
  };
}
