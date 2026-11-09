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
  return clamp01(1 - Math.log(camera.span / stopCam.span) / Math.log(far / stopCam.span));
}

/**
 * Stop i's card by the timeline, not by where the camera is: in iso view two plots can share
 * nearly the same camera centre, so only time can keep a card off another stop. It fades in over
 * the move into stop i, holds through its rest and fades out over the move out of it.
 */
export function cardOpacity(i: number, frame: number, timeline: Timeline): number {
  const { stopFrames, moveFrames } = timeline;
  const rest = stopFrames[i];
  if (rest === undefined) return 0;
  const moveIn = moveFrames[i] ?? 0;
  if (frame < rest) return moveIn > 0 ? clamp01(1 - (rest - frame) / moveIn) : 0;
  const next = stopFrames[i + 1];
  if (next === undefined) return 1;
  const moveOut = moveFrames[i + 1] ?? 0;
  const leave = next - moveOut;
  if (frame <= leave) return 1;
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

/** "1 contribution", "2 contributions": the count is already formatted, only the noun varies. */
export function contributionsLabel(count: number, formatted: string): string {
  return `${formatted} ${count === 1 ? "contribution" : "contributions"}`;
}
