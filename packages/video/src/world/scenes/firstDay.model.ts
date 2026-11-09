import type { RecapData } from "@wyg/schema";

export type FirstDayModel = { date: string; weekday: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The first calendar day with contributions; null when the year has none. Names are fixed, not locale-based. */
export function firstDayModel(data: RecapData): FirstDayModel | null {
  const day = data.contributions.calendar.find((d) => d.count > 0);
  if (!day) return null;
  const at = new Date(`${day.date}T00:00:00Z`);
  return {
    date: `${MONTHS[Number(day.date.slice(5, 7)) - 1] ?? ""} ${Number(day.date.slice(8, 10))}`,
    weekday: WEEKDAYS[at.getUTCDay()] ?? "",
  };
}
