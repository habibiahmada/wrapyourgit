import type { RecapData } from "@wyg/schema";
import { formatCount } from "../../theme";
import { contributionsLabel } from "../fade";

export type BusiestModel = {
  date: string;
  weekday: string;
  count: number;
  headline: string;
  /** "{weekday}, {Mon D} · {count} contributions", singular for one. */
  detail: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The busiest day's flag text; null when the year has none. Names are fixed, not locale-based. */
export function busiestModel(data: RecapData): BusiestModel | null {
  const day = data.contributions.busiestDay;
  if (!day) return null;
  const at = new Date(`${day.date}T00:00:00Z`);
  const date = `${MONTHS[Number(day.date.slice(5, 7)) - 1] ?? ""} ${Number(day.date.slice(8, 10))}`;
  const weekday = WEEKDAYS[at.getUTCDay()] ?? "";
  return {
    date,
    weekday,
    count: day.count,
    headline: "busiest day",
    detail: `${weekday}, ${date} · ${contributionsLabel(day.count, formatCount(day.count))}`,
  };
}
