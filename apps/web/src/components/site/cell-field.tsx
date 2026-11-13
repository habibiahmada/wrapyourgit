/*
 * A field of contribution cells drawn as SVG: the product's identity motif used as a background.
 * It is either a real calendar (heat levels 0-4 from @wyg/video/heat) or, on the landing page, a
 * made-up year that grows busier towards December. Cells light up once, week by week, when
 * motion is allowed (globals.css `.cell-light`); the field itself never loops.
 */

import type { CalendarDay } from "@wyg/schema";
import { calendarGrid, heatLevels } from "@wyg/video/heat";

// GitHub's own dark-mode contribution colours, empty to busiest.
const ON_INK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const ON_PAPER = ["#e6dfcf", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

/** A plausible-looking year for decoration only: activity rises across the weeks. */
export function demoLevels(weeks: number, seed = 7): number[] {
  let state = seed;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const levels: number[] = [];
  for (let week = 0; week < weeks; week++) {
    const growth = 0.15 + 0.8 * (week / weeks);
    for (let day = 0; day < 7; day++) {
      const weekend = day === 0 || day === 6 ? 0.45 : 1;
      const roll = next() * growth * weekend;
      levels.push(roll < 0.12 ? 0 : roll < 0.3 ? 1 : roll < 0.48 ? 2 : roll < 0.62 ? 3 : 4);
    }
  }
  return levels;
}

/** A real calendar as cell levels, column by column; days before the first one stay blank (-1). */
export function calendarLevels(calendar: readonly CalendarDay[]): number[] {
  const levels = heatLevels(calendar);
  const { cells, weeks } = calendarGrid(calendar);
  const grid = new Array<number>(weeks * 7).fill(-1);
  cells.forEach((cell, i) => {
    grid[cell.week * 7 + cell.weekday] = levels[i] ?? 0;
  });
  return grid;
}

export function CellField({
  levels,
  surface = "ink",
  animate = true,
  fit = false,
  className = "",
}: {
  /** One level per day, column by column (7 per week); -1 leaves the slot empty. */
  levels: readonly number[];
  surface?: "ink" | "paper";
  animate?: boolean;
  /**
   * True draws every cell, sized by the field's own width (a real calendar to read). False, the
   * default, fills the box and crops the overflow, which suits a background.
   */
  fit?: boolean;
  className?: string;
}) {
  const colors = surface === "ink" ? ON_INK : ON_PAPER;
  const weeks = Math.ceil(levels.length / 7);
  const step = 12;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${weeks * step} ${7 * step}`}
      preserveAspectRatio={fit ? "xMidYMid meet" : "xMidYMid slice"}
      className={className}
    >
      {levels.map((level, i) => {
        if (level < 0) return null;
        const week = Math.floor(i / 7);
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional and never reorder
            key={i}
            x={week * step + 1}
            y={(i % 7) * step + 1}
            width={step - 2}
            height={step - 2}
            rx={2}
            fill={colors[level] ?? colors[0]}
            className={animate && level > 0 ? "cell-light" : undefined}
            style={animate && level > 0 ? { animationDelay: `${week * 22}ms` } : undefined}
          />
        );
      })}
    </svg>
  );
}
