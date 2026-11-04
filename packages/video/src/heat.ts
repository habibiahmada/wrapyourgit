import type { CalendarDay } from "@wyg/schema";

/**
 * Contribution level 0-4 for each day, like GitHub's graph: 0 is no contributions, 1-4 split the
 * active days into quartiles of their counts. Relative to the user's own year, so a quiet year
 * still shows texture.
 */
export function heatLevels(calendar: readonly CalendarDay[]): number[] {
  const active = calendar
    .map((day) => day.count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);
  const quantile = (q: number) =>
    active[Math.min(active.length - 1, Math.floor(q * active.length))] ?? 0;
  const thresholds = [quantile(0.25), quantile(0.5), quantile(0.75)];
  return calendar.map((day) => {
    if (day.count === 0) return 0;
    return 1 + thresholds.filter((threshold) => day.count > threshold).length;
  });
}

/** Week column and weekday row (0 = Sunday) of each day, with week 0 holding the first day. */
export function calendarGrid(calendar: readonly CalendarDay[]): {
  cells: { week: number; weekday: number }[];
  weeks: number;
} {
  const first = calendar[0];
  if (!first) return { cells: [], weeks: 0 };
  const offset = new Date(`${first.date}T00:00:00Z`).getUTCDay();
  const start = Date.parse(`${first.date}T00:00:00Z`);
  const cells = calendar.map((day) => {
    const index = Math.round((Date.parse(`${day.date}T00:00:00Z`) - start) / 86_400_000) + offset;
    return { week: Math.floor(index / 7), weekday: index % 7 };
  });
  return { cells, weeks: (cells.at(-1)?.week ?? 0) + 1 };
}

/**
 * Largest font size (px) at which `text` fits `maxWidth` on one line, capped at `maxSize`.
 * `charWidth` is the average glyph width in em for the face and weight in use.
 */
export function fitFontSize(text: string, maxWidth: number, maxSize: number, charWidth = 0.62) {
  return Math.min(maxSize, maxWidth / Math.max(1, text.length * charWidth));
}
