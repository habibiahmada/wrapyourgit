import type { RecapData } from "@wyg/schema";
import { formatCount } from "../../theme";
import { contributionsLabel, shortDay, weekdayName } from "../fade";

export type BusiestModel = {
  date: string;
  weekday: string;
  count: number;
  headline: string;
  /** "{weekday}, {Mon D} · {count} contributions", singular for one. */
  detail: string;
};

/** The busiest day's flag text; null when the year has none. Names are fixed, not locale-based. */
export function busiestModel(data: RecapData): BusiestModel | null {
  const day = data.contributions.busiestDay;
  if (!day) return null;
  const date = shortDay(day.date);
  const weekday = weekdayName(day.date);
  return {
    date,
    weekday,
    count: day.count,
    headline: "busiest day",
    detail: `${weekday}, ${date} · ${contributionsLabel(day.count, formatCount(day.count))}`,
  };
}
