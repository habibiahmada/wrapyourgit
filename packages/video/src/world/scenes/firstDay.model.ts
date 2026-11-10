import type { RecapData } from "@wyg/schema";
import { shortDay, weekdayName } from "../fade";

export type FirstDayModel = { date: string; weekday: string };

/** The first calendar day with contributions; null when the year has none. Names are fixed, not locale-based. */
export function firstDayModel(data: RecapData): FirstDayModel | null {
  const day = data.contributions.calendar.find((d) => d.count > 0);
  if (!day) return null;
  return { date: shortDay(day.date), weekday: weekdayName(day.date) };
}
