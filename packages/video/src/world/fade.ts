import { type Camera, PLOT_SPAN } from "./camera";
import type { Timeline } from "./timeline";

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
