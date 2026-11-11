/*
 * What stands behind the scene, in screen space: where the horizon is for this camera, where a
 * compass bearing falls on screen (so stars, the moon and the far skyline turn with the view),
 * and the skyline itself: one tower per week of the year, all the way round.
 */
import type { City } from "../city";
import { type Frame, projector, projectPoint, type RideCamera } from "./project";

/** Screen y of the horizon. Above the frame (negative) when the camera looks down at the ground. */
export function horizonY(cam: RideCamera, frame: Frame): number {
  const dx = cam.look[0] - cam.pos[0];
  const dy = cam.look[1] - cam.pos[1];
  const flat = Math.hypot(dx, dy);
  if (flat < 1e-9) return cam.look[2] < cam.pos[2] ? -frame.height * 10 : frame.height * 11;
  // A point level with the camera, very far away the way it faces.
  const far = projectPoint(
    [cam.pos[0] + (dx / flat) * 1e6, cam.pos[1] + (dy / flat) * 1e6, cam.pos[2]],
    cam,
    frame,
  );
  return far ? far[1] : -frame.height * 10;
}

/** Bearings further than this from the view's heading are not drawn. */
const SIDE_LIMIT = 1.35;

/** Screen x of a compass bearing (radians), or null when it is too far to the side or behind. */
export function bearingX(bearing: number, cam: RideCamera, frame: Frame): number | null {
  const { focal, yaw } = projector(cam, frame);
  let diff = (bearing - yaw) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < SIDE_LIMIT ? frame.width / 2 - Math.tan(diff) * focal : null;
}

/** `height` is a share of the focal length, so the skyline keeps its size on screen as the lens changes. */
export type Tower = { bearing: number; height: number };

const TOWERS = 120;
const LOWEST = 0.012;
const RANGE = 0.07;

export function skyline(city: City): Tower[] {
  const weeks: number[] = [];
  for (const plot of city.plots) weeks[plot.col] = (weeks[plot.col] ?? 0) + plot.count;
  const most = Math.max(1, ...weeks);
  return Array.from({ length: TOWERS }, (_, k) => ({
    bearing: (k / TOWERS) * Math.PI * 2,
    // Step through the weeks with a stride that shares no factor with their number, so
    // neighbouring towers come from different parts of the year.
    height: LOWEST + ((weeks[(k * 7) % weeks.length] ?? 0) / most) * RANGE,
  }));
}
