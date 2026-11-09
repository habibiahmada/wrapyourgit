import type { City } from "./city";
import { cityBounds, isoPoint, plotHeight } from "./city";
import type { Stop } from "./stops";
import type { Timeline } from "./timeline";
import { easeInOutCubic } from "./timeline";

export type Camera = { x: number; y: number; span: number };

type Frame = { width: number; height: number };

/** World units across the shorter side when the camera is on a single plot. */
export const PLOT_SPAN = 2.4;

const CITY_MARGIN = 1.1;
const HOP_LIFT = 1.2;

/** Whether a move is a long hop between close-ups, which zooms out mid-flight. */
export function isHop(a: Camera, b: Camera): boolean {
  return (
    a.span <= 2 * PLOT_SPAN &&
    b.span <= 2 * PLOT_SPAN &&
    Math.hypot(b.x - a.x, b.y - a.y) > 4 * PLOT_SPAN
  );
}

export function stopCamera(stop: Stop, city: City, frame: Frame): Camera {
  const plot = stop.plot === null ? undefined : city.plots[stop.plot];
  if (!plot) {
    const b = cityBounds(city);
    // span is along the shorter side, so convert the fitted extent through the aspect ratio.
    const shorter = Math.min(frame.width, frame.height);
    const scale = Math.min(
      frame.width / ((b.maxX - b.minX) * CITY_MARGIN),
      frame.height / ((b.maxY - b.minY) * CITY_MARGIN),
    );
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, span: shorter / scale };
  }
  const { x, y } = isoPoint(plot.col, plot.row);
  return { x, y: y - plotHeight(plot, city.maxCount), span: PLOT_SPAN };
}

/** World to pixel: the shorter side of the frame spans `camera.span` world units. */
export function project(
  point: { x: number; y: number },
  camera: Camera,
  frame: Frame,
): { x: number; y: number } {
  const scale = Math.min(frame.width, frame.height) / camera.span;
  return {
    x: frame.width / 2 + (point.x - camera.x) * scale,
    y: frame.height / 2 + (point.y - camera.y) * scale,
  };
}

export function cameraAt(frame: number, cameras: Camera[], timeline: Timeline): Camera {
  const first = cameras[0];
  const lastCam = cameras.at(-1);
  if (!first || !lastCam) throw new Error("cameraAt needs at least one camera");
  for (let i = 1; i < cameras.length; i++) {
    const end = timeline.stopFrames[i] ?? 0;
    if (frame >= end) continue;
    const a = cameras[i - 1] as Camera;
    const b = cameras[i] as Camera;
    const start = end - (timeline.moveFrames[i] ?? 0);
    if (frame <= start) return a;
    const e = easeInOutCubic((frame - start) / (end - start));
    let logSpan = Math.log(a.span) + (Math.log(b.span) - Math.log(a.span)) * e;
    if (isHop(a, b)) logSpan += HOP_LIFT * Math.sin(Math.PI * e);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, span: Math.exp(logSpan) };
  }
  return frame < 0 ? first : lastCam;
}
