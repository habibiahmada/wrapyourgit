import type { RecapData } from "@wyg/schema";

export type PlotState = "active" | "zero" | "not-yet";

export type Plot = {
  index: number;
  date: string;
  col: number;
  row: number;
  count: number;
  state: PlotState;
};

export type City = {
  plots: Plot[];
  maxCount: number;
  busiestIndex: number | null;
  firstActiveIndex: number | null;
  /** Last plot that holds real data; later plots are not-yet in a provisional recap. */
  lastDataIndex: number;
};

export const TILE_W = 1;
export const TILE_H = 0.5;

const FLAT_HEIGHT = 0.12;
const MIN_ACTIVE_HEIGHT = 0.4;
const ACTIVE_HEIGHT_RANGE = 7.6;
const DAY_MS = 86_400_000;

export function buildCity(data: RecapData): City {
  const { year, periodEnd, isFinal } = data.meta;
  const counts = new Map(data.contributions.calendar.map((d) => [d.date, d.count]));
  const start = Date.UTC(year, 0, 1);
  const days = (Date.UTC(year + 1, 0, 1) - start) / DAY_MS;
  // Weeks start on Sunday like the GitHub graph, so Jan 1 sits mid-week in column 0.
  const startWeekday = new Date(start).getUTCDay();

  const plots: Plot[] = [];
  let maxCount = 0;
  let firstActiveIndex: number | null = null;
  let lastDataIndex = days - 1;

  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    const notYet = !isFinal && date > periodEnd;
    const count = notYet ? 0 : (counts.get(date) ?? 0);
    const state: PlotState = notYet ? "not-yet" : count > 0 ? "active" : "zero";
    if (notYet && lastDataIndex === days - 1) lastDataIndex = i - 1;
    if (count > maxCount) maxCount = count;
    if (state === "active" && firstActiveIndex === null) firstActiveIndex = i;
    plots.push({
      index: i,
      date,
      col: Math.floor((i + startWeekday) / 7),
      row: (i + startWeekday) % 7,
      count,
      state,
    });
  }

  // The metric owns "busiest"; a date outside the year's plots (never expected) yields null.
  const busiestDate = data.contributions.busiestDay?.date;
  const found = busiestDate === undefined ? -1 : plots.findIndex((p) => p.date === busiestDate);
  const busiestIndex = found === -1 ? null : found;

  return { plots, maxCount, busiestIndex, firstActiveIndex, lastDataIndex };
}

export function isoPoint(col: number, row: number): { x: number; y: number } {
  return { x: (col - row) * TILE_W, y: (col + row) * TILE_H };
}

export function plotHeight(plot: Plot, maxCount: number): number {
  if (plot.state !== "active" || maxCount <= 0) return FLAT_HEIGHT;
  return MIN_ACTIVE_HEIGHT + (ACTIVE_HEIGHT_RANGE * plot.count) / maxCount;
}

/** Screen-space box of every tile; y grows downward, so buildings extend minY upward. */
export function cityBounds(city: City): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const plot of city.plots) {
    const { x, y } = isoPoint(plot.col, plot.row);
    const top = y - plotHeight(plot, city.maxCount);
    minX = Math.min(minX, x - TILE_W);
    maxX = Math.max(maxX, x + TILE_W);
    minY = Math.min(minY, top);
    maxY = Math.max(maxY, y + TILE_H);
  }
  return { minX, maxX, minY, maxY };
}
