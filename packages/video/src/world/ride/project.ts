/*
 * The ride's camera: a pinhole that turns a point in the world (x and y on the ground, z up) into
 * a point on screen. Pure maths, no WebGL (ADR-0013): prims.ts builds the picture on top of it.
 */

export type V3 = [number, number, number];
export type Frame = { width: number; height: number };
/** `fov` is the vertical field of view in degrees. */
export type RideCamera = { pos: V3; look: V3; fov: number };

/** Nothing nearer than this is drawn: a face that crosses the lens would turn inside out. */
export const NEAR = 0.25;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V3): V3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

export function projector(cam: RideCamera, frame: Frame) {
  const forward = unit(sub(cam.look, cam.pos));
  const right = unit(cross(forward, [0, 0, 1]));
  const up = cross(right, forward);
  const focal = frame.height / 2 / Math.tan(((cam.fov / 2) * Math.PI) / 180);
  return {
    /** Right, up and depth of a world point, as the camera sees it. */
    toCamera(p: V3): V3 {
      const d = sub(p, cam.pos);
      return [dot(d, right), dot(d, up), dot(d, forward)];
    },
    toScreen(c: V3): [number, number] {
      return [frame.width / 2 + (c[0] / c[2]) * focal, frame.height / 2 - (c[1] / c[2]) * focal];
    },
    /** Pixels per world unit at depth 1. */
    focal,
    /** Heading of the view on the ground, radians. */
    yaw: Math.atan2(forward[1], forward[0]),
  };
}

/** Screen x, y and depth; null when the point is nearer than NEAR. */
export function projectPoint(
  p: V3,
  cam: RideCamera,
  frame: Frame,
): [number, number, number] | null {
  const lens = projector(cam, frame);
  const c = lens.toCamera(p);
  if (c[2] < NEAR) return null;
  const [x, y] = lens.toScreen(c);
  return [x, y, c[2]];
}
