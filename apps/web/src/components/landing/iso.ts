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

/** Back to front: farther boxes (smaller x + y) first, lower ones before those stacked on them. */
export function paintOrder(boxes: readonly Box[]): Box[] {
  const depth = (b: Box) => b.at[0] + b.size[0] / 2 + (b.at[1] + b.size[1] / 2);
  return [...boxes].sort((a, b) => depth(a) - depth(b) || a.at[2] - b.at[2]);
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
