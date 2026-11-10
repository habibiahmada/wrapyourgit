import { type Camera, PLOT_SPAN } from "./camera";
import { easeInOutCubic, type Timeline } from "./timeline";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 1 at the city overview, 0 once the camera is down to a few plots. Eased on log(span). */
export function cityOpacity(camera: Camera, citySpan: number): number {
  const near = Math.log(3 * PLOT_SPAN);
  const far = Math.log(citySpan);
  if (far <= near) return camera.span >= citySpan ? 1 : 0;
  return clamp01((Math.log(camera.span) - near) / (far - near));
}

/** 1 with the camera at a stop's zoom, 0 at the city overview. */
export function zoomFade(camera: Camera, stopCam: Camera, citySpan: number): number {
  const far = Math.max(citySpan, 3 * PLOT_SPAN);
  // At the city's own camera there is no zoom range left to fade over (and log(1) would divide by
  // zero): the layer is fully in, and time alone (cardOpacity) decides when it shows.
  if (far <= stopCam.span) return 1;
  return clamp01(1 - Math.log(camera.span / stopCam.span) / Math.log(far / stopCam.span));
}

/**
 * Stop i's card by the timeline, not by where the camera is: in iso view two plots can share
 * nearly the same camera centre, so only time can keep a card off another stop. It fades in over
 * the move into stop i, holds through its rest and fades out over the move out of it. Between two
 * stops on the same camera (`inPlace`) the cards cut at the start of the move instead: the incoming
 * scene draws its own transition over the outgoing picture, so a crossfade would only ghost.
 */
export function cardOpacity(i: number, frame: number, timeline: Timeline): number {
  const { stopFrames, moveFrames, inPlace } = timeline;
  const rest = stopFrames[i];
  if (rest === undefined) return 0;
  const moveIn = moveFrames[i] ?? 0;
  if (frame < rest) {
    if (moveIn <= 0) return 0;
    // Strictly after the move's first frame, mirroring the outgoing card's `frame <= leave`: on the
    // boundary frame (the previous rest, in interactive mode) only the previous page shows.
    if (inPlace?.[i]) return frame > rest - moveIn ? 1 : 0;
    return clamp01(1 - (rest - frame) / moveIn);
  }
  const next = stopFrames[i + 1];
  if (next === undefined) return 1;
  const moveOut = moveFrames[i + 1] ?? 0;
  const leave = next - moveOut;
  if (frame <= leave) return 1;
  if (inPlace?.[i + 1]) return 0;
  return moveOut > 0 ? clamp01((next - frame) / moveOut) : 0;
}

/**
 * How far stop i's scene has entered: 0 until the camera starts moving into it, eased with the
 * camera over that move, 1 from the rest frame on (the hold and the move out keep it entered, so a
 * scene fades away whole). Scenes animate their entrance from this, never from wall time.
 */
export function enterProgress(i: number, frame: number, timeline: Timeline): number {
  const rest = timeline.stopFrames[i];
  if (rest === undefined) return 0;
  if (frame >= rest) return 1;
  const move = timeline.moveFrames[i] ?? 0;
  if (move <= 0) return 0;
  return easeInOutCubic(clamp01(1 - (rest - frame) / move));
}

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
