/*
 * THROWAWAY SPIKE: a tiny perspective renderer in SVG, so the camera can ride the train into the
 * screen without WebGL (ADR-0013). Boxes (optionally turned about the vertical axis) project
 * through a pinhole camera; faces turned away are dropped; the rest is sorted far to near and
 * painted. The crisp look stays: one flat colour per facing, a hairline edge, fog with distance.
 */
import type { ReactNode } from "react";

export type V = [number, number, number];
export type Tone = { top: string; left: string; right: string };
export type Cam = { pos: V; look: V; fov: number };

export function mixHex(a: string, b: string, t: number): string {
  const c = (h: string, i: number) => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * t))
    .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
    .join("")}`;
}
export const toneOf = (hex: string): Tone => ({
  top: mixHex(hex, "#ffffff", 0.16),
  left: hex,
  right: mixHex(hex, "#000000", 0.3),
});

export type Solid =
  | {
      kind: "box";
      at: V;
      size: V;
      tone: Tone;
      edge?: boolean;
      /** Image printed near the top of each side face. */
      logo?: string;
      /** Turn about the vertical axis through `pivot` (radians). */
      yaw?: number;
      pivot?: [number, number];
      /** Skip the fog (lit things stay bright far away). */
      lit?: boolean;
      /** Flat detail painted on faces: windows, stripes, hubs, frames. */
      decals?: Decal[];
      /** Words and numbers printed on faces, so stats live on the objects themselves. */
      texts?: FaceText[];
    }
  | { kind: "ball"; c: V; r: number; color: string; opacity?: number };

export type FaceName = "top" | "front" | "back" | "left" | "right";
/**
 * A rectangle (or a disc inscribed in it) on a face, in the face's own 0..1 units: u runs left to
 * right as seen from outside, v runs up (on the top face: u forward, v to the left).
 */
export type Decal = {
  on: FaceName | "sides" | "all";
  rect: [number, number, number, number];
  fill: string;
  round?: boolean;
};

/** One line of text fitted inside `rect` on a face (same units as a decal), lying on the face. */
export type FaceText = {
  on: FaceName | "sides" | "all";
  rect: [number, number, number, number];
  text: string;
  fill: string;
  weight?: number;
};

type Prim =
  | {
      kind: "text";
      m: string;
      text: string;
      x: number;
      y: number;
      size: number;
      fill: string;
      weight: number;
      depth: number;
    }
  | { kind: "poly"; pts: [number, number][]; fill: string; depth: number; edge: boolean }
  | {
      kind: "circle";
      x: number;
      y: number;
      r: number;
      fill: string;
      depth: number;
      opacity: number;
    }
  | { kind: "image"; m: string; href: string; depth: number };

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Corners run bottom-left, bottom-right, top-right, top-left as seen from outside the face. */
const FACES: { n: V; corners: [number, number, number][]; tone: keyof Tone; name: FaceName }[] = [
  {
    n: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    tone: "top",
    name: "top",
  },
  {
    n: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    tone: "right",
    name: "front",
  },
  {
    n: [-1, 0, 0],
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
    tone: "left",
    name: "back",
  },
  {
    n: [0, 1, 0],
    corners: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
    ],
    tone: "left",
    name: "left",
  },
  {
    n: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    tone: "right",
    name: "right",
  },
];
const decalOn = (d: { on: Decal["on"] }, face: FaceName) =>
  d.on === face ||
  (d.on === "all" && face !== "top") ||
  (d.on === "sides" && (face === "left" || face === "right"));

function basis(cam: Cam, height: number) {
  const f = norm(sub(cam.look, cam.pos));
  const r = norm(cross(f, [0, 0, 1]));
  const u = cross(r, f);
  const focal = height / 2 / Math.tan(((cam.fov / 2) * Math.PI) / 180);
  return { f, r, u, focal };
}

export function renderScene(
  solids: Solid[],
  cam: Cam,
  width: number,
  height: number,
  fog: { color: string; near: number; far: number },
): ReactNode {
  const { f, r, u, focal } = basis(cam, height);
  const toCam = (p: V): V => {
    const d = sub(p, cam.pos);
    return [dot(d, r), dot(d, u), dot(d, f)];
  };
  const proj = (c: V): [number, number] => [
    width / 2 + (c[0] / c[2]) * focal,
    height / 2 - (c[1] / c[2]) * focal,
  ];
  const fogged = (color: string, depth: number) => {
    const t = Math.max(0, Math.min(1, (depth - fog.near) / (fog.far - fog.near)));
    return t <= 0 ? color : mixHex(color, fog.color, t);
  };
  const prims: Prim[] = [];
  for (const s of solids) {
    if (s.kind === "ball") {
      const c = toCam(s.c);
      // Puffs right at the lens would cover the view.
      if (c[2] < 3) continue;
      const [x, y] = proj(c);
      prims.push({
        kind: "circle",
        x,
        y,
        r: (s.r * focal) / c[2],
        fill: fogged(s.color, c[2]),
        depth: c[2],
        opacity: s.opacity ?? 1,
      });
      continue;
    }
    const [x, y, z] = s.at;
    const [w, d, h] = s.size;
    const cos = Math.cos(s.yaw ?? 0);
    const sin = Math.sin(s.yaw ?? 0);
    const [px, py] = s.pivot ?? [x + w / 2, y + d / 2];
    const turn = (p: V): V =>
      s.yaw
        ? [
            px + (p[0] - px) * cos - (p[1] - py) * sin,
            py + (p[0] - px) * sin + (p[1] - py) * cos,
            p[2],
          ]
        : p;
    for (const face of FACES) {
      const n: V = s.yaw
        ? [face.n[0] * cos - face.n[1] * sin, face.n[0] * sin + face.n[1] * cos, face.n[2]]
        : face.n;
      const world = face.corners.map(([i, j, k]) => turn([x + i * w, y + j * d, z + k * h])) as [
        V,
        V,
        V,
        V,
      ];
      const mid: V = [
        (world[0][0] + world[2][0]) / 2,
        (world[0][1] + world[2][1]) / 2,
        (world[0][2] + world[2][2]) / 2,
      ];
      if (dot(n, sub(cam.pos, mid)) <= 0) continue;
      const cs = world.map(toCam);
      if (cs.some((c) => c[2] < 0.25)) continue;
      const depth = toCam(mid)[2];
      const fill = s.lit ? s.tone[face.tone] : fogged(s.tone[face.tone], depth);
      prims.push({ kind: "poly", pts: cs.map(proj), fill, depth, edge: s.edge !== false });
      for (const decal of s.decals ?? []) {
        if (!decalOn(decal, face.name)) continue;
        const [u0, v0, u1, v1] = decal.rect;
        const point = (u: number, v: number): V => [
          world[0][0] + (world[1][0] - world[0][0]) * u + (world[3][0] - world[0][0]) * v,
          world[0][1] + (world[1][1] - world[0][1]) * u + (world[3][1] - world[0][1]) * v,
          world[0][2] + (world[1][2] - world[0][2]) * u + (world[3][2] - world[0][2]) * v,
        ];
        const outline: V[] = decal.round
          ? Array.from({ length: 14 }, (_, k) => {
              const a = (k / 14) * Math.PI * 2;
              return point(
                (u0 + u1) / 2 + (Math.cos(a) * (u1 - u0)) / 2,
                (v0 + v1) / 2 + (Math.sin(a) * (v1 - v0)) / 2,
              );
            })
          : [point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1)];
        prims.push({
          kind: "poly",
          pts: outline.map((q) => proj(toCam(q))),
          fill: s.lit ? decal.fill : fogged(decal.fill, depth),
          depth: depth - 0.02,
          edge: false,
        });
      }
      for (const label of s.texts ?? []) {
        if (!decalOn(label, face.name) || !label.text) continue;
        const [u0, v0, u1, v1] = label.rect;
        const point = (u: number, v: number): V => [
          world[0][0] + (world[1][0] - world[0][0]) * u + (world[3][0] - world[0][0]) * v,
          world[0][1] + (world[1][1] - world[0][1]) * u + (world[3][1] - world[0][1]) * v,
          world[0][2] + (world[1][2] - world[0][2]) * u + (world[3][2] - world[0][2]) * v,
        ];
        const tl = point(u0, v1);
        const tr = point(u1, v1);
        const bl = point(u0, v0);
        const wide = Math.hypot(tr[0] - tl[0], tr[1] - tl[1], tr[2] - tl[2]);
        const tall = Math.hypot(tl[0] - bl[0], tl[1] - bl[1], tl[2] - bl[2]);
        if (wide <= 0 || tall <= 0) continue;
        const a = proj(toCam(tl));
        const b = proj(toCam(tr));
        const c = proj(toCam(bl));
        // The face's own axes on screen, per world unit: text is laid out in world units on them.
        prims.push({
          kind: "text",
          m: `matrix(${(b[0] - a[0]) / wide} ${(b[1] - a[1]) / wide} ${(c[0] - a[0]) / tall} ${(c[1] - a[1]) / tall} ${a[0]} ${a[1]})`,
          text: label.text,
          x: wide / 2,
          y: tall / 2,
          size: Math.min(tall * 0.92, wide / (0.6 * label.text.length)),
          fill: s.lit ? label.fill : fogged(label.fill, depth),
          weight: label.weight ?? 800,
          depth: depth - 0.03,
        });
      }
      if (s.logo && face.n[2] === 0) {
        // Print the image's unit square on the face (affine, close enough at this size).
        const faceW = Math.hypot(world[1][0] - world[0][0], world[1][1] - world[0][1]);
        const m = Math.min(faceW, h) * 0.62;
        if (h < m * 1.15) continue;
        const rx = (world[1][0] - world[0][0]) / faceW;
        const ry = (world[1][1] - world[0][1]) / faceW;
        const off = (faceW - m) / 2;
        const tl: V = [world[3][0] + rx * off, world[3][1] + ry * off, world[3][2] - m * 0.14];
        const a = proj(toCam(tl));
        const b = proj(toCam([tl[0] + rx * m, tl[1] + ry * m, tl[2]]));
        const c = proj(toCam([tl[0], tl[1], tl[2] - m]));
        prims.push({
          kind: "image",
          m: `matrix(${b[0] - a[0]} ${b[1] - a[1]} ${c[0] - a[0]} ${c[1] - a[1]} ${a[0]} ${a[1]})`,
          href: s.logo,
          depth: depth - 0.01,
        });
      }
    }
  }
  prims.sort((a, b) => b.depth - a.depth);
  return prims.map((p, i) => {
    if (p.kind === "circle") {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: spike
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.fill} opacity={p.opacity} />
      );
    }
    if (p.kind === "text") {
      return (
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: spike
          key={i}
          transform={p.m}
          x={p.x}
          y={p.y}
          fontSize={p.size}
          fontWeight={p.weight}
          fill={p.fill}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {p.text}
        </text>
      );
    }
    if (p.kind === "image") {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: spike
        <image key={i} href={p.href} width={1} height={1} transform={p.m} />
      );
    }
    return (
      <polygon
        // biome-ignore lint/suspicious/noArrayIndexKey: spike
        key={i}
        points={p.pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")}
        fill={p.fill}
        stroke={p.edge ? mixHex(p.fill, "#000000", 0.35) : p.fill}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    );
  });
}

/** One world point on screen plus its depth (for labels), or null when it's behind the camera. */
export function projectPoint(
  p: V,
  cam: Cam,
  width: number,
  height: number,
): [number, number, number] | null {
  const { f, r, u, focal } = basis(cam, height);
  const d = sub(p, cam.pos);
  const c: V = [dot(d, r), dot(d, u), dot(d, f)];
  if (c[2] < 0.3) return null;
  return [width / 2 + (c[0] / c[2]) * focal, height / 2 - (c[1] / c[2]) * focal, c[2]];
}

/** Pixels per world unit at depth 1, and the camera's heading, for screen-space scenery. */
export function lens(cam: Cam, height: number): { focal: number; yaw: number } {
  const { f, focal } = basis(cam, height);
  return { focal, yaw: Math.atan2(f[1], f[0]) };
}
