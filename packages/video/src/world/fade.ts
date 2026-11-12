/**
 * The last stop the camera has arrived at by `frame`: its rest frame has been reached. Pure in the
 * frame, so seeking back over a segment gives the same answer as playing forward over it.
 */
export function reachedStop(frame: number, stopFrames: number[]): number {
  let reached = 0;
  for (let i = 0; i < stopFrames.length; i++) if (frame >= (stopFrames[i] ?? 0)) reached = i;
  return reached;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "January 3" from "2026-01-03"; fixed names so a render never depends on the host's locale. */
export function formatDay(iso: string): string {
  const month = MONTHS[Number(iso.slice(5, 7)) - 1] ?? "";
  return `${month} ${Number(iso.slice(8, 10))}`;
}

/** "Jan 3" from "2026-01-03": formatDay's fixed month name cut to three letters. */
export function shortDay(iso: string): string {
  const month = MONTHS[Number(iso.slice(5, 7)) - 1] ?? "";
  return `${month.slice(0, 3)} ${Number(iso.slice(8, 10))}`;
}

/** Fixed weekday names, index 0 Sunday: the order of `contributions.weekday` and `getUTCDay`. */
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** "Saturday" from "2026-01-03", read in UTC so the host's time zone can't shift the day. */
export function weekdayName(iso: string): string {
  return WEEKDAYS[new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()] ?? "";
}

/** "1 contribution", "2 contributions": the count is already formatted, only the noun varies. */
export function contributionsLabel(count: number, formatted: string): string {
  return `${formatted} ${count === 1 ? "contribution" : "contributions"}`;
}
