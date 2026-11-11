/*
 * From solids to a picture: boxes (with detail and words painted on their faces) and balls go
 * through the camera and come out as flat primitives, far to near, ready to paint in order.
 * A box face is dropped when it looks away or crosses the lens; what is left keeps the landing's
 * crisp look: one flat colour per facing, a hairline edge, fog with distance.
 */
import { mixHex, type Tone } from "./palette";
import { type Frame, NEAR, projector, type RideCamera, type V3 } from "./project";

/** `front` is the box's +x face, `back` its -x, `left` its +y, `right` its -y. */
export type FaceName = "top" | "front" | "back" | "left" | "right";
/** `sides` is left and right; `all` is the four upright faces. */
export type FaceSet = FaceName | "sides" | "all";
type Rect = [u0: number, v0: number, u1: number, v1: number];

/**
 * A rectangle (or the disc inside it) on a face, in the face's own 0..1 units: `u` runs left to
 * right as seen from outside, `v` runs up. On the top face `u` runs along +x and `v` along +y.
 */
export type Decal = { on: FaceSet; rect: Rect; fill: string; round?: boolean };
/** One line of text fitted inside `rect` on a face, lying on the face. */
export type FaceText = {
  on: FaceSet;
  rect: Rect;
  text: string;
  fill: string;
  weight?: number;
  /** Turn the text half round in its rect: for words on the ground read from the other side. */
  flip?: boolean;
};

export type Box = {
  kind: "box";
  at: V3;
  size: V3;
  tone: Tone;
  /** Turn about the vertical through `pivot` (the box's centre when left out), radians. */
  yaw?: number;
  pivot?: [number, number];
  /** A hairline edge in a darker shade of the face. Default true. */
  edge?: boolean;
  /** Skip the fog: lit things stay bright far away. */
  lit?: boolean;
  /** Edges only, no fill: a day that has not happened. */
  outline?: boolean;
  decals?: Decal[];
  texts?: FaceText[];
  /** An image printed near the top of each upright face that is tall enough for it. */
  logo?: string;
  /** The logo's side in world units; by default 62% of the face's shorter side. */
  logoSide?: number;
  /** What this box is ("day", "sleeper", "gate-sign"), for tests and debugging; never drawn. */
  tag?: string;
};
export type Ball = { kind: "ball"; c: V3; r: number; color: string; opacity?: number };
export type Solid = Box | Ball;
export type Fog = { color: string; near: number; far: number };

type Matrix = [number, number, number, number, number, number];
export type Prim =
  | {
      kind: "poly";
      pts: [number, number][];
      fill: string | null;
      stroke: string | null;
      depth: number;
    }
  | {
      kind: "circle";
      x: number;
      y: number;
      r: number;
      fill: string;
      opacity: number;
      depth: number;
    }
  | { kind: "image"; matrix: Matrix; href: string; depth: number }
  | {
      kind: "text";
      matrix: Matrix;
      text: string;
      /** Where the text is centred, in world units along and down the face from the rect's top left. */
      x: number;
      y: number;
      /** Font size in world units. */
      size: number;
      fill: string;
      weight: number;
      /** How tall a capital letter is on screen, for checking that it can be read. */
      capHeightPx: number;
      depth: number;
    };

/** A puff nearer than this would cover the view. */
const BALL_NEAR = 3;
const CAP_HEIGHT = 0.7;
const CHAR_WIDTH = 0.6;

/** The font size (world units) at which `text` fills a `wide` by `tall` rect. */
export function fitText(text: string, wide: number, tall: number): number {
  return Math.min(tall * 0.92, wide / (CHAR_WIDTH * Math.max(1, text.length)));
}

/** Corners run bottom-left, bottom-right, top-right, top-left as seen from outside the face. */
const FACES: { name: FaceName; normal: V3; corners: [V3, V3, V3, V3]; tone: keyof Tone }[] = [
  {
    name: "top",
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    tone: "top",
  },
  {
    name: "front",
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    tone: "right",
  },
  {
    name: "back",
    normal: [-1, 0, 0],
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
    tone: "left",
  },
  {
    name: "left",
    normal: [0, 1, 0],
    corners: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
    ],
    tone: "left",
  },
  {
    name: "right",
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    tone: "right",
  },
];

const isOn = (set: FaceSet, face: FaceName) =>
  set === face ||
  (set === "all" && face !== "top") ||
  (set === "sides" && (face === "left" || face === "right"));

const length = (a: V3, b: V3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

export function scenePrims(
  solids: readonly Solid[],
  cam: RideCamera,
  frame: Frame,
  fog: Fog,
): Prim[] {
  const lens = projector(cam, frame);
  const screen = (p: V3) => lens.toScreen(lens.toCamera(p));
  const fogged = (color: string, depth: number, lit: boolean | undefined) =>
    lit ? color : mixHex(color, fog.color, (depth - fog.near) / (fog.far - fog.near));
  const prims: Prim[] = [];

  for (const solid of solids) {
    if (solid.kind === "ball") {
      const c = lens.toCamera(solid.c);
      if (c[2] < BALL_NEAR) continue;
      const [x, y] = lens.toScreen(c);
      prims.push({
        kind: "circle",
        x,
        y,
        r: (solid.r * lens.focal) / c[2],
        fill: fogged(solid.color, c[2], false),
        opacity: solid.opacity ?? 1,
        depth: c[2],
      });
      continue;
    }

    const [x, y, z] = solid.at;
    const [w, d, h] = solid.size;
    const yaw = solid.yaw ?? 0;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const [px, py] = solid.pivot ?? [x + w / 2, y + d / 2];
    const turn = (p: V3): V3 =>
      yaw === 0
        ? p
        : [
            px + (p[0] - px) * cos - (p[1] - py) * sin,
            py + (p[0] - px) * sin + (p[1] - py) * cos,
            p[2],
          ];

    for (const face of FACES) {
      const n = face.normal;
      const normal: V3 = yaw === 0 ? n : [n[0] * cos - n[1] * sin, n[0] * sin + n[1] * cos, n[2]];
      const world = face.corners.map(([i, j, k]) => turn([x + i * w, y + j * d, z + k * h])) as [
        V3,
        V3,
        V3,
        V3,
      ];
      const mid: V3 = [
        (world[0][0] + world[2][0]) / 2,
        (world[0][1] + world[2][1]) / 2,
        (world[0][2] + world[2][2]) / 2,
      ];
      const toward =
        normal[0] * (cam.pos[0] - mid[0]) +
        normal[1] * (cam.pos[1] - mid[1]) +
        normal[2] * (cam.pos[2] - mid[2]);
      if (toward <= 0) continue;
      const corners = world.map(lens.toCamera);
      if (corners.some((c) => c[2] < NEAR)) continue;
      const depth = lens.toCamera(mid)[2];
      const colour = fogged(solid.tone[face.tone], depth, solid.lit);
      prims.push({
        kind: "poly",
        pts: corners.map(lens.toScreen),
        fill: solid.outline ? null : colour,
        stroke: solid.outline
          ? fogged(solid.tone.top, depth, solid.lit)
          : solid.edge === false
            ? colour
            : mixHex(colour, "#000000", 0.35),
        depth,
      });
      /** A point on the face from its own units. */
      const point = (u: number, v: number): V3 => [
        world[0][0] + (world[1][0] - world[0][0]) * u + (world[3][0] - world[0][0]) * v,
        world[0][1] + (world[1][1] - world[0][1]) * u + (world[3][1] - world[0][1]) * v,
        world[0][2] + (world[1][2] - world[0][2]) * u + (world[3][2] - world[0][2]) * v,
      ];

      for (const decal of solid.decals ?? []) {
        if (!isOn(decal.on, face.name)) continue;
        const [u0, v0, u1, v1] = decal.rect;
        const outline: V3[] = decal.round
          ? Array.from({ length: 14 }, (_, k) => {
              const a = (k / 14) * Math.PI * 2;
              return point(
                (u0 + u1) / 2 + (Math.cos(a) * (u1 - u0)) / 2,
                (v0 + v1) / 2 + (Math.sin(a) * (v1 - v0)) / 2,
              );
            })
          : [point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1)];
        const fill = fogged(decal.fill, depth, solid.lit);
        prims.push({
          kind: "poly",
          pts: outline.map(screen),
          fill,
          stroke: fill,
          depth: depth - 0.02,
        });
      }

      /** The matrix that lays a `wide` by `tall` patch of the face, from `topLeft`, on the screen. */
      const patch = (
        topLeft: V3,
        topRight: V3,
        bottomLeft: V3,
      ): { matrix: Matrix; wide: number; tall: number } => {
        const wide = length(topLeft, topRight);
        const tall = length(topLeft, bottomLeft);
        const a = screen(topLeft);
        const b = screen(topRight);
        const c = screen(bottomLeft);
        return {
          matrix: [
            (b[0] - a[0]) / wide,
            (b[1] - a[1]) / wide,
            (c[0] - a[0]) / tall,
            (c[1] - a[1]) / tall,
            a[0],
            a[1],
          ],
          wide,
          tall,
        };
      };

      for (const label of solid.texts ?? []) {
        if (!isOn(label.on, face.name) || label.text === "") continue;
        const [u0, v0, u1, v1] = label.rect;
        const { matrix, wide, tall } = label.flip
          ? patch(point(u1, v0), point(u0, v0), point(u1, v1))
          : patch(point(u0, v1), point(u1, v1), point(u0, v0));
        if (!(wide > 0 && tall > 0)) continue;
        const size = fitText(label.text, wide, tall);
        prims.push({
          kind: "text",
          matrix,
          text: label.text,
          x: wide / 2,
          y: tall / 2,
          size,
          fill: fogged(label.fill, depth, solid.lit),
          weight: label.weight ?? 800,
          capHeightPx: CAP_HEIGHT * size * Math.hypot(matrix[2], matrix[3]),
          depth: depth - 0.03,
        });
      }

      if (solid.logo && face.name !== "top") {
        const faceWide = length(world[0], world[1]);
        const side = solid.logoSide ?? Math.min(faceWide, h) * 0.62;
        if (h < side * 1.15) continue;
        const inset = (faceWide - side) / 2 / faceWide;
        const top = 1 - (side * 0.14) / h;
        const bottom = top - side / h;
        const { matrix } = patch(point(inset, top), point(1 - inset, top), point(inset, bottom));
        // The image is one unit square under the matrix, so scale the matrix up to the logo's side.
        prims.push({
          kind: "image",
          matrix: [
            matrix[0] * side,
            matrix[1] * side,
            matrix[2] * side,
            matrix[3] * side,
            matrix[4],
            matrix[5],
          ],
          href: solid.logo,
          depth: depth - 0.01,
        });
      }
    }
  }
  return prims.sort((a, b) => b.depth - a.depth);
}
