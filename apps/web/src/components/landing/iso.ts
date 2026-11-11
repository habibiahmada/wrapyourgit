/*
 * Isometric line-art for the landing page, in the same 2:1 projection as the story's city
 * (packages/video/src/world/city.ts: a tile is one unit along x and y, half a unit tall on
 * screen). x runs down-right, y runs down-left, z runs up. Pure functions, so the art is drawn
 * on the server and tested with bun.
 */

export type Vec = [x: number, y: number, z: number];
export type Tone = { top: string; left: string; right: string };
export type Box = { at: Vec; size: Vec; tone: Tone };
export type BoxPaths = { top: string; left: string; right: string; tone: Tone };

/** GitHub-dark line art (DESIGN.md "Web"): dark faces, the contribution greens when lit. */
export const TONES = {
  dark: { top: "#21262d", left: "#161b22", right: "#11161d" },
  deep: { top: "#161b22", left: "#0d1117", right: "#0a0e13" },
  lit: { top: "#39d353", left: "#1f8a3a", right: "#16672b" },
  mid: { top: "#26a641", left: "#1a6f2e", right: "#145624" },
  low: { top: "#006d32", left: "#044a24", right: "#033a1c" },
  faint: { top: "#0e4429", left: "#0a3220", right: "#08281a" },
} as const satisfies Record<string, Tone>;

export const EDGE = "#30363d";

/** Screen point of a world point. */
export function iso([x, y, z]: Vec): [number, number] {
  return [x - y, (x + y) / 2 - z];
}

const n = (value: number) => Number(value.toFixed(3));
const path = (points: Vec[]) =>
  `M${points
    .map(iso)
    .map(([x, y]) => `${n(x)} ${n(y)}`)
    .join("L")}Z`;

/** The three visible faces of a box: its top, the face toward +y (left) and toward +x (right). */
export function boxPaths({ at: [x, y, z], size: [w, d, h], tone }: Box): BoxPaths {
  const t = z + h;
  return {
    top: path([
      [x, y, t],
      [x + w, y, t],
      [x + w, y + d, t],
      [x, y + d, t],
    ]),
    left: path([
      [x, y + d, t],
      [x + w, y + d, t],
      [x + w, y + d, z],
      [x, y + d, z],
    ]),
    right: path([
      [x + w, y, t],
      [x + w, y + d, t],
      [x + w, y + d, z],
      [x + w, y, z],
    ]),
    tone,
  };
}

const EPS = 1e-6;
const lo = (b: Box, axis: number) => b.at[axis] ?? 0;
const hi = (b: Box, axis: number) => (b.at[axis] ?? 0) + (b.size[axis] ?? 0);

/** True when two boxes share volume; boxes that only touch on a face don't. */
export function intersects(a: Box, b: Box): boolean {
  return [0, 1, 2].every(
    (axis) => lo(a, axis) < hi(b, axis) - EPS && lo(b, axis) < hi(a, axis) - EPS,
  );
}

/** Screen-space bounding box of a box's corners. */
function screenBox(b: Box): [number, number, number, number] {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const cx of [lo(b, 0), hi(b, 0)])
    for (const cy of [lo(b, 1), hi(b, 1)])
      for (const cz of [lo(b, 2), hi(b, 2)]) {
        const [sx, sy] = iso([cx, cy, cz]);
        xs.push(sx);
        ys.push(sy);
      }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/**
 * Whether `a` must be painted before `b`. For boxes that don't intersect, one is entirely
 * behind the other along x or y (the viewer looks from +x, +y) or entirely below it.
 */
function behind(a: Box, b: Box): boolean {
  if (hi(a, 0) <= lo(b, 0) + EPS) return true;
  if (hi(a, 1) <= lo(b, 1) + EPS) return true;
  if (hi(a, 2) <= lo(b, 2) + EPS && !(hi(b, 0) <= lo(a, 0) + EPS) && !(hi(b, 1) <= lo(a, 1) + EPS))
    return true;
  return false;
}

/**
 * Painter's order for non-intersecting boxes: a topological sort over every pair whose screen
 * footprints overlap, so a big base is drawn before what stands on it and a box behind before
 * the one in front, whatever their sizes. (Sorting by centre depth fails for mixed sizes: a
 * slab's centre sits in front of the buildings at its back.) Ties keep the input order.
 */
export function paintOrder(boxes: readonly Box[]): Box[] {
  const n = boxes.length;
  const screens = boxes.map(screenBox);
  const after: number[][] = Array.from({ length: n }, () => []);
  const incoming = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [ax0, ay0, ax1, ay1] = screens[i] ?? [0, 0, 0, 0];
      const [bx0, by0, bx1, by1] = screens[j] ?? [0, 0, 0, 0];
      if (ax1 <= bx0 + EPS || bx1 <= ax0 + EPS || ay1 <= by0 + EPS || by1 <= ay0 + EPS) continue;
      const a = boxes[i] as Box;
      const b = boxes[j] as Box;
      const [first, second] = behind(a, b) ? [i, j] : behind(b, a) ? [j, i] : [-1, -1];
      if (first === -1) continue;
      after[first]?.push(second);
      incoming[second] = (incoming[second] ?? 0) + 1;
    }
  }
  const ready = boxes.map((_, i) => i).filter((i) => incoming[i] === 0);
  const order: number[] = [];
  while (ready.length > 0) {
    ready.sort((x, y) => x - y);
    const next = ready.shift() as number;
    order.push(next);
    for (const k of after[next] ?? []) {
      incoming[k] = (incoming[k] ?? 0) - 1;
      if (incoming[k] === 0) ready.push(k);
    }
  }
  // A cycle can only come from intersecting boxes, which the scene tests rule out; keep the
  // rest rather than drop them.
  for (let i = 0; i < n; i++) if (!order.includes(i)) order.push(i);
  return order.map((i) => boxes[i] as Box);
}

/** Screen-space viewBox around every corner of the boxes and extra points, with a margin. */
export function viewBoxOf(boxes: readonly Box[], extra: readonly Vec[] = [], margin = 0.6): string {
  const corners: Vec[] = [...extra];
  for (const {
    at: [x, y, z],
    size: [w, d, h],
  } of boxes) {
    for (const cx of [x, x + w])
      for (const cy of [y, y + d]) for (const cz of [z, z + h]) corners.push([cx, cy, cz]);
  }
  const points = corners.map(iso);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs) - margin;
  const minY = Math.min(...ys) - margin;
  return `${n(minX)} ${n(minY)} ${n(Math.max(...xs) - minX + margin)} ${n(Math.max(...ys) - minY + margin)}`;
}
