import type { Tone } from "./palette";
import type { Box } from "./prims";
import type { V3 } from "./project";
import { at, heading } from "./track";

/** What a box can carry besides its place, size and tone. */
export type BoxExtra = Partial<Omit<Box, "kind" | "at" | "size" | "tone" | "yaw" | "pivot">>;

/** A box centred on a point beside the rail, turned to the rail's heading there. Its x runs forward. */
export function railBox(
  s: number,
  lateral: number,
  z: number,
  size: V3,
  tone: Tone,
  extra: BoxExtra = {},
): Box {
  const c = at(s, lateral);
  return {
    kind: "box",
    at: [c[0] - size[0] / 2, c[1] - size[1] / 2, z],
    size,
    tone,
    yaw: heading(s),
    pivot: [c[0], c[1]],
    ...extra,
  };
}

/**
 * A box that is part of a group sharing one pivot and one turn: `dx` forward and `dy` to the left
 * of the group's centre `c`, `z` above it.
 */
export function part(
  c: V3,
  yaw: number,
  dx: number,
  dy: number,
  z: number,
  size: V3,
  tone: Tone,
  extra: BoxExtra = {},
): Box {
  return {
    kind: "box",
    at: [c[0] + dx - size[0] / 2, c[1] + dy - size[1] / 2, c[2] + z],
    size,
    tone,
    yaw,
    pivot: [c[0], c[1]],
    ...extra,
  };
}
