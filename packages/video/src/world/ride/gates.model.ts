import type { RecapData } from "@wyg/schema";
import { formatCount } from "../../theme";
import type { City } from "../city";

const NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export type Gate = {
  /** 0 to 11. */
  month: number;
  name: string;
  /** Week column of the 1st of the month. */
  col: number;
  /**
   * Contributions on the days before the 1st of this month. Null for January (nothing came
   * before it) and for a month that has not started in a provisional year.
   */
  before: number | null;
  /** "432 so far", or null when `before` is null. */
  line: string | null;
};

/**
 * The twelve month gates the train passes under. Their "so far" is the calendar summed by date up
 * to the day before the month begins: a way of showing `contributions.calendar`, not a metric of
 * its own (docs/analytics/metrics.md).
 */
export function gates(data: RecapData, city: City): Gate[] {
  const { year, periodEnd, isFinal } = data.meta;
  return NAMES.map((name, month) => {
    const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const col = city.plots.find((plot) => plot.date === first)?.col ?? 0;
    const started = isFinal || first <= periodEnd;
    if (month === 0 || !started) return { month, name, col, before: null, line: null };
    let before = 0;
    for (const day of data.contributions.calendar) if (day.date < first) before += day.count;
    return { month, name, col, before, line: `${formatCount(before)} so far` };
  });
}
