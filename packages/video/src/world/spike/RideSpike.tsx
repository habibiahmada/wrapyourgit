/*
 * THROWAWAY SPIKE (not product code): the story as a ride. Cell drives a little engine along a
 * winding rail through the twelve month gates of the year, whose squares wake up on both sides.
 * The camera rides behind Cell into the screen, lifts overhead, tracks low from the side, and at
 * each stop settles on the isometric angle of the landing while the hero builds itself from the
 * data. Perspective SVG (persp.tsx): flat colours only, on real ground under a night sky.
 */
import type { RecapData } from "@wyg/schema";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sampleRecap } from "../../fixtures/sample-recap";
import { heatLevels } from "../../heat";
import { languageIcon } from "../../languages";
import { fontFamily, formatCount } from "../../theme";
import { buildCity } from "../city";
import { gardenModel } from "../scenes/garden.model";
import { projectsModel } from "../scenes/projects.model";
import { easeInOutCubic } from "../timeline";
import {
  type Cam,
  type Decal,
  type FaceText,
  lens,
  mixHex,
  projectPoint,
  renderScene,
  type Solid,
  type Tone,
  toneOf,
  type V,
} from "./persp";

const FPS = 30;
export const RIDE_FRAMES = 600;
const SKY = "#0b1220";
const HAZE = "#16241d";
const GROUND = "#111a16";
const LIT = "#39d353";
const INK = "#0d1117";
const GREENS = ["#0e4429", "#006d32", "#26a641", "#39d353"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const heat = (i: number) => toneOf(GREENS[Math.max(0, Math.min(3, i))] ?? LIT);
const TONE = {
  dim: { top: "#1b2420", left: "#161d1a", right: "#121815" },
  dark: { top: "#3a424d", left: "#2d333b", right: "#21262d" },
  mid: { top: "#6e7681", left: "#545d68", right: "#444c56" },
  gravel: { top: "#232c28", left: "#1c2420", right: "#171d1a" },
  soil: toneOf("#5a4634"),
  rail: toneOf("#9aa4af"),
  engine: toneOf("#1f8a3a"),
  engineDark: toneOf("#176b2c"),
  plaza: { top: "#2a323c", left: "#1f262e", right: "#181d24" },
  wood: toneOf("#9a7550"),
  cell: toneOf("#3fd45a"),
  cellDark: toneOf("#2ea043"),
  ink: toneOf(INK),
  lamp: toneOf("#ffd866"),
  leaf: toneOf("#2a6f66"),
  leafTop: toneOf("#368f84"),
  rock: toneOf("#4a535e"),
} satisfies Record<string, Tone>;

/* ---------------------------------------------------------------- the track */

const AMP = 5;
const WAVE = 64;
const YEAR_START = 14;
const WEEK = 1.55;
const pathY = (s: number) => AMP * Math.sin(((s - 4) / WAVE) * Math.PI * 2);
const heading = (s: number) =>
  Math.atan(((AMP * Math.PI * 2) / WAVE) * Math.cos(((s - 4) / WAVE) * Math.PI * 2));
/** A point `lateral` to the right of the track at distance `s`. */
function at(s: number, lateral = 0, z = 0): V {
  const h = heading(s);
  return [s + Math.sin(h) * lateral, pathY(s) - Math.cos(h) * lateral, z];
}

const STOP_B = 50;
const STOP_C = 98;
function trainS(frame: number): number {
  const ease = (a: number, b: number, f0: number, f1: number) =>
    a + (b - a) * easeInOutCubic(Math.max(0, Math.min(1, (frame - f0) / (f1 - f0))));
  if (frame < 200) return ease(4, STOP_B, 70, 200);
  return ease(STOP_B, STOP_C, 320, 430);
}

type BoxExtra = {
  edge?: boolean;
  logo?: string;
  lit?: boolean;
  decals?: Decal[];
  texts?: FaceText[];
};
/** Dark ink on light faces, white on dark ones, so printed numbers always read. */
const inkOn = (hex: string) => {
  const c = (i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
  return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2) > 0.5 ? INK : "#ffffff";
};
/** A sign board on two posts across the track's direction: words on the faces toward and away from travel. */
function board(c: V, yaw: number, dx: number, dy: number, wide: number, lines: string[]): Solid[] {
  const tall = 0.5 + lines.length * 0.62;
  const texts: FaceText[] = lines.flatMap((text, i): FaceText[] => {
    const top = 1 - (0.14 + i * 0.62) / tall;
    const bottom = 1 - (0.14 + i * 0.62 + (i === 0 ? 0.5 : 0.56)) / tall;
    return ["front", "back"].map((on) => ({
      on: on as "front" | "back",
      rect: [0.06, bottom, 0.94, top],
      text,
      fill: i === 0 ? "#c9d1d9" : "#ffffff",
      weight: i === 0 ? 700 : 800,
    }));
  });
  return [
    part(c, yaw, dx, dy - wide * 0.36, 0, [0.14, 0.14, 1.5], TONE.dark, { edge: false }),
    part(c, yaw, dx, dy + wide * 0.36, 0, [0.14, 0.14, 1.5], TONE.dark, { edge: false }),
    part(c, yaw, dx, dy, 1.5, [0.16, wide, tall], TONE.ink, {
      lit: true,
      texts,
      decals: [
        { on: "front", rect: [0, 0, 1, 0.05], fill: LIT },
        { on: "back", rect: [0, 0, 1, 0.05], fill: LIT },
      ],
    }),
  ];
}
/** A box centred on a track point, turned to the track's heading. Local x runs forward. */
function railBox(
  s: number,
  lateral: number,
  z: number,
  size: V,
  tone: Tone,
  extra: BoxExtra = {},
): Solid {
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
/** Parts of one thing sharing a pivot and a yaw: `dx` forward, `dy` to the left, from its centre. */
function part(
  c: V,
  yaw: number,
  dx: number,
  dy: number,
  z: number,
  size: V,
  tone: Tone,
  extra: BoxExtra = {},
): Solid {
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

const pop = (frame: number, start: number, damping = 11) =>
  spring({ frame: frame - start, fps: FPS, config: { damping, stiffness: 140, mass: 0.7 } });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V, b: V, t: number): V => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/* ---------------------------------------------------------------- pieces */

const HUB: Decal[] = [
  { on: "sides", rect: [0.12, 0.12, 0.88, 0.88], fill: "#8b949e", round: true },
  { on: "sides", rect: [0.36, 0.36, 0.64, 0.64], fill: INK, round: true },
];
const CRATE: Decal[] = [
  { on: "all", rect: [0, 0, 1, 0.12], fill: "#6f5238" },
  { on: "all", rect: [0, 0.88, 1, 1], fill: "#6f5238" },
  { on: "all", rect: [0, 0, 0.1, 1], fill: "#6f5238" },
  { on: "all", rect: [0.9, 0, 1, 1], fill: "#6f5238" },
  { on: "all", rect: [0.1, 0.47, 0.9, 0.53], fill: "#7d5d40" },
  { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: "#b08a61" },
];

function tree(c: V, k: number): Solid[] {
  return [
    part(c, 0, 0, 0, 0, [0.24 * k, 0.24 * k, 0.8 * k], TONE.wood, { edge: false }),
    part(c, 0, 0, 0, 0.8 * k, [1.2 * k, 1.2 * k, 0.85 * k], TONE.leaf, {
      decals: [{ on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: TONE.leafTop.left }],
    }),
    part(c, 0, 0, 0, 1.65 * k, [0.75 * k, 0.75 * k, 0.6 * k], TONE.leafTop),
  ];
}

function cell(c: V, yaw: number, frame: number, mood: "ride" | "cheer" | "idle"): Solid[] {
  const k = 1.15;
  const hop =
    mood === "cheer"
      ? Math.abs(Math.sin(frame / 5)) * 0.32
      : mood === "ride"
        ? Math.abs(Math.sin(frame / 4)) * 0.05
        : Math.abs(Math.sin(frame / 14)) * 0.03;
  const o: V = [c[0], c[1], c[2] + hop];
  const leg = 0.13 * k;
  const p = (dx: number, dy: number, z: number, size: V, tone: Tone, extra: BoxExtra = {}) =>
    part(o, yaw, dx, dy, z, size, tone, extra);
  const blink = frame % 87 < 4;
  // Face on the forward side, in face units: eyes with a glint, a mouth that opens for a cheer.
  const face: Decal[] = [-1, 1].flatMap((side): Decal[] => {
    const u = 0.5 + side * 0.22;
    return blink
      ? [{ on: "front", rect: [u - 0.09, 0.56, u + 0.09, 0.6], fill: INK }]
      : [
          { on: "front", rect: [u - 0.09, 0.46, u + 0.09, 0.72], fill: INK },
          { on: "front", rect: [u + 0.01, 0.62, u + 0.07, 0.69], fill: "#ffffff" },
        ];
  });
  face.push(
    mood === "cheer"
      ? { on: "front", rect: [0.39, 0.16, 0.61, 0.36], fill: INK }
      : { on: "front", rect: [0.39, 0.26, 0.61, 0.31], fill: INK },
  );
  const out: Solid[] = [];
  for (const dy of [-0.16, 0.16])
    out.push(p(0, dy * k, 0, [0.16 * k, 0.16 * k, leg], TONE.cellDark));
  out.push(
    p(0, 0, leg, [0.6 * k, 0.64 * k, 0.62 * k], TONE.cell, {
      decals: [...face, { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: "#6ee787" }],
    }),
  );
  // A little pack on its back, so Cell reads from behind too.
  out.push(
    p(-0.36 * k, 0, leg + 0.14 * k, [0.14 * k, 0.42 * k, 0.36 * k], TONE.dark, {
      decals: [{ on: "back", rect: [0.15, 0.55, 0.85, 0.75], fill: LIT }],
    }),
  );
  for (const side of [-1, 1]) {
    const lift =
      mood === "cheer"
        ? 0.62
        : mood === "ride" && side > 0
          ? 0.16 + Math.max(0, Math.sin(frame / 7)) * 0.42
          : 0.12;
    out.push(p(0, side * 0.38 * k, leg + lift * k, [0.11 * k, 0.11 * k, 0.28 * k], TONE.cell));
  }
  [-0.16, 0, 0.16].forEach((dy, i) => {
    const b = Math.max(0, Math.sin(frame / 5 - i * 0.8)) * 0.06 * k;
    out.push(p(0, dy * k, leg + 0.62 * k + b, [0.12 * k, 0.12 * k, 0.12 * k], heat(i + 1)));
  });
  return out;
}

/* ---------------------------------------------------------------- camera */

type Look = "ahead" | "cell" | "train" | "hero";
type Key = { at: number; theta: number; radius: number; height: number; fov: number; look: Look };
/** Behind Cell, into the screen. */
const RIDE = { theta: Math.PI, radius: 4.6, height: 2.4, fov: 56, look: "ahead" } as const;
/** Overhead: the isometric angle, following the train. */
const OVER = { theta: Math.PI * 0.75, radius: 15, height: 8.7, fov: 34, look: "train" } as const;
/** Low and close from the side, wheels at eye level. */
const SIDE = { theta: Math.PI * 0.56, radius: 5.6, height: 1.2, fov: 50, look: "train" } as const;
/** The landing's isometric angle on a stop's hero: 45 degrees round, 30 up, through a long lens. */
const ISO = { theta: Math.PI * 0.75, radius: 19.5, height: 11.3, fov: 25, look: "hero" } as const;
/**
 * `theta` is the camera's angle round the engine from the direction of travel (0 in front, π
 * straight behind, in between on the left). Shots change on a log scale for distance and lens so
 * a lift-out reads as one smooth pull.
 */
const KEYS: Key[] = [
  { at: 0, theta: 0.75, radius: 3.0, height: 1.9, fov: 56, look: "cell" },
  { at: 26, theta: 1.0, radius: 3.2, height: 1.9, fov: 56, look: "cell" },
  { at: 74, ...RIDE },
  { at: 122, ...RIDE },
  { at: 150, ...OVER },
  { at: 178, ...OVER, theta: Math.PI * 0.8 },
  { at: 216, ...ISO },
  { at: 312, ...ISO, theta: Math.PI * 0.71, radius: 18, height: 10.4 },
  { at: 344, ...RIDE },
  { at: 362, ...RIDE },
  { at: 382, ...SIDE },
  { at: 398, ...SIDE, theta: Math.PI * 0.5 },
  { at: 420, ...RIDE },
  { at: 450, ...ISO },
  { at: 600, ...ISO, theta: Math.PI * 0.7, radius: 18, height: 10.4 },
];

/* ---------------------------------------------------------------- the composition */

export function RideSpike({ data = sampleRecap }: { data?: RecapData }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const unit = Math.min(width, height);
  const year = useMemo(() => {
    const city = buildCity(data);
    const levels = heatLevels(city.plots);
    const byWeek: number[] = [];
    for (const p of city.plots) byWeek[p.col] = (byWeek[p.col] ?? 0) + p.count;
    const upToWeek: number[] = [];
    byWeek.forEach((v, i) => {
      upToWeek[i] = (upToWeek[i - 1] ?? 0) + (v ?? 0);
    });
    return {
      plots: city.plots.map((p) => ({
        s: YEAR_START + p.col * WEEK,
        lateral: p.row < 3 ? -(2.9 + (2 - p.row) * 1.05) : 2.9 + (p.row - 3) * 1.05,
        level: levels[p.index] ?? 0,
      })),
      byWeek,
      upToWeek,
      monthWeek: MONTHS.map(
        (_, m) => city.plots.find((p) => Number(p.date.slice(5, 7)) === m + 1)?.col ?? 0,
      ),
    };
  }, [data]);
  const garden = useMemo(() => gardenModel(data), [data]);
  const projects = useMemo(() => projectsModel(data), [data]);

  const ts = trainS(frame);
  const speed = Math.abs(trainS(frame + 1) - ts);
  const moving = speed > 0.02;
  const h = heading(ts);
  const tp = at(ts);
  const ground: Solid[] = [];
  const objs: Solid[] = [];
  const near = (s: number) => s > ts - 26 && s < ts + 56;
  const heroAt = (stop: number) => at(stop + 4.5, 8);
  const byHero = (s: number, pad: number) =>
    Math.abs(s - (STOP_B + 4.5)) < pad || Math.abs(s - (STOP_C + 4.5)) < pad;

  // The year on both sides of the rail: squares wake up in a wave that runs ahead of the train.
  for (const d of year.plots) {
    if (!near(d.s)) continue;
    const lit = Math.max(0, Math.min(1, (ts + 15 - d.s) / 2.5));
    const on = d.level > 0 && lit > 0;
    const tone = on ? heat(d.level - 1) : TONE.dim;
    ground.push(
      railBox(d.s, d.lateral, 0, [0.9, 0.9, on ? 0.05 + lit * d.level * 0.06 : 0.04], tone, {
        edge: on,
        decals: on
          ? [{ on: "top", rect: [0.16, 0.16, 0.84, 0.84], fill: mixHex(tone.top, "#ffffff", 0.16) }]
          : undefined,
      }),
    );
  }
  // The rail on its ballast: sleepers and two rails in short pieces that follow the curve.
  for (let s = Math.floor((ts - 24) / 0.7) * 0.7; s < ts + 56; s += 0.7) {
    ground.push(railBox(s, 0, 0, [0.72, 2.3, 0.02], TONE.gravel, { edge: false }));
    ground.push(railBox(s, 0, 0.02, [0.22, 1.5, 0.05], TONE.soil, { edge: false }));
    for (const lat of [-0.5, 0.5])
      ground.push(railBox(s, lat, 0.07, [0.72, 0.08, 0.08], TONE.rail, { edge: false }));
  }

  // A gate per month: its sign carries the month and the contributions made before it.
  year.monthWeek.forEach((week, m) => {
    const s = YEAR_START + week * WEEK - 0.8;
    if (!near(s) || byHero(s, 8)) return;
    for (const lat of [-2.1, 2.1]) {
      objs.push(railBox(s, lat, 0, [0.5, 0.5, 0.3], TONE.mid));
      objs.push(
        railBox(s, lat, 0.3, [0.28, 0.28, 3.3], TONE.dark, {
          decals: [{ on: "all", rect: [0, 0.86, 1, 0.94], fill: LIT }],
        }),
      );
    }
    objs.push(
      railBox(
        s,
        0,
        3.6,
        [0.32, 4.6, 0.3],
        { top: "#56e070", left: LIT, right: "#26a641" },
        { lit: true },
      ),
    );
    const before = week > 0 ? (year.upToWeek[week - 1] ?? 0) : 0;
    const signTexts: FaceText[] = (["front", "back"] as const).flatMap((on): FaceText[] => [
      { on, rect: [0.08, 0.5, 0.92, 0.94], text: MONTHS[m] ?? "", fill: "#ffffff" },
      {
        on,
        rect: [0.08, 0.08, 0.92, 0.44],
        text: `${formatCount(before)} so far`,
        fill: "#7ee08f",
        weight: 700,
      },
    ]);
    objs.push(railBox(s, 0, 3.9, [0.14, 2.6, 1.25], TONE.ink, { lit: true, texts: signTexts }));
  });
  // Lamps, trees, rocks and bushes: the land around the line.
  for (let k = Math.floor((ts - 26) / 4.5); k * 4.5 < ts + 56; k++) {
    const s = k * 4.5;
    if (s < 0 || byHero(s, 8)) continue;
    for (const side of [-1, 1]) {
      const r = random(`prop${k}${side}`);
      const lat = side * (8.4 + random(`lat${k}${side}`) * 5);
      const c = at(s + random(`ds${k}${side}`) * 2, lat);
      if (k % 2 === 0 && side === (k % 4 === 0 ? 1 : -1)) {
        const lc = at(s, side * 7.6);
        objs.push(part(lc, 0, 0, 0, 0, [0.34, 0.34, 0.14], TONE.mid, { edge: false }));
        objs.push(part(lc, 0, 0, 0, 0.14, [0.12, 0.12, 2.3], TONE.dark, { edge: false }));
        objs.push(part(lc, 0, 0, 0, 2.44, [0.36, 0.36, 0.24], TONE.lamp, { lit: true }));
      }
      if (r < 0.5) objs.push(...tree(c, 0.8 + random(`k${k}${side}`) * 0.5));
      else if (r < 0.75) objs.push(part(c, r * 6, 0, 0, 0, [0.7, 0.5, 0.32], TONE.rock));
      else
        objs.push(
          part(c, 0, 0, 0, 0, [0.8, 0.8, 0.42], TONE.leaf, {
            decals: [{ on: "top", rect: [0.15, 0.15, 0.85, 0.85], fill: TONE.leafTop.left }],
          }),
        );
    }
  }

  // Where the ride starts: a board with whose year this is.
  if (near(1))
    objs.push(
      ...board(at(0.4), heading(0.4), 0, -2.6, 4.2, [
        `${data.meta.year}`,
        `@${data.profile.login}`,
      ]),
    );

  // The train: engine with Cell aboard, two wagons of green cargo, each on its own bit of rail.
  const P = (dx: number, dy: number, z: number, size: V, tone: Tone, extra: BoxExtra = {}) =>
    part(tp, h, dx, dy, z, size, tone, extra);
  objs.push(
    P(-0.3, 0, 0.2, [2.5, 1.1, 0.3], TONE.engine, {
      decals: [{ on: "sides", rect: [0, 0.5, 1, 0.78], fill: "#56d364" }],
    }),
  );
  objs.push(P(1.0, 0, 0.2, [0.1, 1.24, 0.16], TONE.mid));
  objs.push(
    P(0.45, 0, 0.5, [1.0, 0.8, 0.44], TONE.engineDark, {
      decals: [
        { on: "sides", rect: [0.82, 0, 1, 1], fill: "#2ea043" },
        { on: "front", rect: [0.3, 0.2, 0.7, 0.8], fill: "#ffd866", round: true },
        { on: "top", rect: [0.08, 0.2, 0.5, 0.8], fill: "#1f8a3a" },
      ],
    }),
  );
  objs.push(P(0.62, 0, 0.94, [0.24, 0.24, 0.44], TONE.dark));
  objs.push(P(0.62, 0, 1.38, [0.34, 0.34, 0.08], TONE.mid));
  objs.push(
    P(-1.22, 0, 0.5, [0.62, 1.0, 0.3], TONE.dark, {
      decals: [
        { on: "back", rect: [0.08, 0.25, 0.26, 0.75], fill: "#ffd866" },
        { on: "back", rect: [0.74, 0.25, 0.92, 0.75], fill: "#ffd866" },
        { on: "top", rect: [0.12, 0.1, 0.88, 0.9], fill: "#161b22" },
      ],
    }),
  );
  for (const dx of [-1.1, -0.3, 0.5])
    for (const dy of [-0.6, 0.6])
      objs.push(P(dx, dy, 0.02, [0.42, 0.1, 0.42], TONE.ink, { decals: HUB }));
  for (const k of [0, 1]) {
    const ws = ts - 2.8 - k * 1.5;
    const wc = at(ws);
    const wy = heading(ws);
    objs.push(part(wc, wy, 0, 0, 0.2, [1.25, 1.05, 0.26], TONE.dark));
    objs.push(
      part(wc, wy, 0, 0, 0.46, [1.05, 0.85, 0.36 + k * 0.12], heat(2 + k), {
        decals: [
          { on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: k ? "#7ee08f" : "#56d364" },
          { on: "all", rect: [0, 0.42, 1, 0.5], fill: "#196c2e" },
        ],
      }),
    );
    for (const dx of [-0.35, 0.35])
      for (const dy of [-0.56, 0.56])
        objs.push(part(wc, wy, dx, dy, 0.02, [0.36, 0.1, 0.36], TONE.ink, { decals: HUB }));
  }
  for (let k = 0; k < 7; k++) {
    const born = Math.floor(frame / 5) * 5 - k * 5;
    const age = (frame - born) / 36;
    if (age < 0 || age > 1) continue;
    const bp = at(trainS(born) + 0.62);
    objs.push({
      kind: "ball",
      c: [bp[0], bp[1], 1.6 + age * 2.4],
      r: 0.14 + age * 0.34,
      color: "#b1bac4",
      opacity: (1 - age) * 0.5,
    });
  }

  // Camera.
  const i = Math.max(0, KEYS.findIndex((k) => k.at > frame) - 1);
  const ka = KEYS[i] as Key;
  const kb = KEYS[i + 1] ?? ka;
  const kt = kb.at === ka.at ? 1 : easeInOutCubic(Math.min(1, (frame - ka.at) / (kb.at - ka.at)));
  const logLerp = (a: number, b: number) => Math.exp(lerp(Math.log(a), Math.log(b), kt));
  const riding = ka.look === "ahead" && kb.look === "ahead";
  const theta = lerp(ka.theta, kb.theta, kt) + (riding && moving ? Math.sin(frame / 31) * 0.2 : 0);
  const radius = logLerp(ka.radius, kb.radius);
  const bump = Math.abs(Math.sin(ts * Math.PI * 1.4)) * speed * 0.12;
  const pos: V = [
    tp[0] + Math.cos(h + theta) * radius,
    tp[1] + Math.sin(h + theta) * radius,
    logLerp(ka.height, kb.height) + (riding && moving ? Math.sin(frame / 43) * 0.25 : 0) + bump,
  ];
  const hero = frame < 380 ? heroAt(STOP_B) : heroAt(STOP_C);
  const cellPos: V = [at(ts - 0.35)[0], at(ts - 0.35)[1], 1.2];
  const lookOf = (l: Look): V =>
    l === "ahead"
      ? at(ts + 7, 0, 1.0)
      : l === "cell"
        ? cellPos
        : l === "train"
          ? [at(ts - 1)[0], at(ts - 1)[1], 0.8]
          : lerpV([tp[0], tp[1], 1.2], [hero[0], hero[1], frame < 380 ? 3.4 : 5.2], 0.55);
  const fovBase = logLerp(ka.fov, kb.fov);
  const cam: Cam = {
    pos,
    look: lerpV(lookOf(ka.look), lookOf(kb.look), kt),
    fov:
      fovBase * (portrait ? 1.42 + 0.5 * Math.max(0, Math.min(1, (56 - fovBase) / 30)) : 1) +
      Math.min(10, speed * 22),
  };
  const roll =
    riding && moving
      ? Math.sin(frame / 31) * -2.2 + (heading(ts + 5) - h) * -14 * Math.min(1, speed * 3)
      : 0;

  // Cell: faces forward on the ride, turns to the camera and cheers at a stop.
  const stopped = !moving && frame > 100;
  const turn = stopped ? easeInOutCubic(Math.min(1, (frame - (frame < 380 ? 205 : 435)) / 20)) : 0;
  const cheering =
    (frame > 34 && frame < 66) || (frame > 250 && frame < 305) || (frame > 505 && frame < 575);
  objs.push(
    ...cell(
      [at(ts - 0.35)[0], at(ts - 0.35)[1], 0.5],
      h + theta * Math.max(0, turn) * 0.85,
      frame,
      cheering ? "cheer" : moving ? "ride" : "idle",
    ),
  );

  // A stop's plaza: a paved slab with a rim, bollards at the corners, a step toward the rail.
  const plaza = (stop: number) => {
    const c = heroAt(stop);
    const yaw = heading(stop + 4.5);
    objs.push(
      part(c, yaw, 0, 0, 0, [9.6, 4.8, 0.25], TONE.plaza, {
        decals: [
          { on: "top", rect: [0.02, 0.04, 0.98, 0.96], fill: "#323b46" },
          { on: "all", rect: [0, 0.7, 1, 1], fill: "#26a641" },
        ],
      }),
    );
    objs.push(part(c, yaw, 0, 2.8, 0, [3.2, 0.8, 0.12], TONE.plaza));
    for (const dx of [-4.5, 4.5])
      for (const dy of [-2.1, 2.1]) {
        objs.push(part(c, yaw, dx, dy, 0.25, [0.22, 0.22, 0.5], TONE.dark));
        objs.push(
          part(c, yaw, dx, dy, 0.75, [0.26, 0.26, 0.12], TONE.lamp, { lit: true, edge: false }),
        );
      }
    return { c, yaw };
  };

  // Stop B: a podium of the top three languages, each block wearing its logo.
  if (near(STOP_B + 4.5)) {
    const { c, yaw } = plaza(STOP_B);
    objs.push(...board(c, yaw, 5.6, 0, 4.4, ["Top languages", garden.title]));
    const slots = [
      { rank: 1, dx: -2.6, start: 226 },
      { rank: 0, dx: 0, start: 238 },
      { rank: 2, dx: 2.6, start: 214 },
    ];
    for (const { rank, dx, start } of slots) {
      const t = garden.trees[rank];
      if (!t) continue;
      objs.push(part(c, yaw, dx, 0, 0.25, [2.5, 2.5, 0.22], TONE.dark));
      const icon = languageIcon(t.name);
      const g = pop(frame, start, 9);
      if (g <= 0.001) continue;
      const hgt = 3.0 + t.share * 4.6;
      const ink = inkOn(t.color);
      // From the top of each side: the logo, then the share in big type, then the name.
      const faceTexts: FaceText[] = [
        { on: "all", rect: [0.08, 1 - 2.42 / hgt, 0.92, 1 - 1.72 / hgt], text: t.label, fill: ink },
        {
          on: "all",
          rect: [0.06, 1 - 2.82 / hgt, 0.94, 1 - 2.48 / hgt],
          text: t.name,
          fill: ink,
          weight: 700,
        },
      ];
      const tone = toneOf(t.color);
      objs.push(
        part(c, yaw, dx, 0, 0.47 + (1 - g) * 6, [2.2, 2.2, hgt], tone, {
          logo: icon ? staticFile(icon) : undefined,
          lit: true,
          texts: faceTexts,
          decals: [
            { on: "all", rect: [0, 0, 1, 0.06], fill: tone.right },
            { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: mixHex(t.color, "#ffffff", 0.3) },
          ],
        }),
      );
    }
    const burst = frame - 252;
    const first = garden.trees[0];
    if (burst > 0 && burst < 70 && first) {
      const topZ = 0.47 + 3.0 + first.share * 4.6;
      for (let k = 0; k < 34; k++) {
        const t = burst / 30;
        const z = topZ + (2.5 + random(`cz${k}`) * 3) * t - 2.6 * t * t;
        if (z < 0.3) continue;
        const colors = [first.color, LIT, "#e3b341"];
        objs.push({
          kind: "ball",
          c: [
            c[0] + (random(`cx${k}`) - 0.5) * 3.4 * t,
            c[1] + (random(`cy${k}`) - 0.5) * 3.4 * t,
            z,
          ],
          r: 0.09,
          color: colors[k % 3] ?? LIT,
        });
      }
    }
  }

  // Stop C: crates fall and stack into one tower per repository.
  if (near(STOP_C + 4.5)) {
    const { c, yaw } = plaza(STOP_C);
    objs.push(...board(c, yaw, 5.6, 0, 4.4, ["Repositories", projects.subtitle ?? projects.title]));
    projects.stacks.slice(0, 3).forEach((s, idx) => {
      const dx = -2.6 + idx * 2.6;
      const start = 452 + idx * 18;
      objs.push(part(c, yaw, dx, 0, 0.25, [1.7, 1.7, 0.14], TONE.dark));
      for (let k = 0; k < s.crates; k++) {
        const g = pop(frame, start + k * 6, 9);
        if (g <= 0.001) continue;
        objs.push(
          part(c, yaw, dx, 0, 0.39 + k * 0.95 + (1 - g) * 5, [1.25, 1.25, 0.95], TONE.wood, {
            lit: true,
            decals: CRATE,
          }),
        );
      }
      const shown = Math.min(1, Math.max(0, (frame - start) / (s.crates * 6 + 10)));
      // A plaque in front of the tower: the repository and its commits, counting up as crates land.
      const plaque: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => [
        { on, rect: [0.06, 0.56, 0.94, 0.92], text: s.label, fill: "#c9d1d9", weight: 700 },
        {
          on,
          rect: [0.06, 0.08, 0.94, 0.54],
          text: `${formatCount(Math.round(s.commits * shown))} commits`,
          fill: "#ffffff",
        },
      ]);
      objs.push(part(c, yaw, dx, 1.55, 0.25, [0.12, 0.12, 0.3], TONE.dark, { edge: false }));
      objs.push(
        part(c, yaw, dx, 1.55, 0.55, [2.3, 0.12, 0.95], TONE.ink, {
          lit: true,
          texts: plaque,
          decals: [{ on: "sides", rect: [0, 0, 1, 0.06], fill: "#e3b341" }],
        }),
      );
    });
  }

  // Sky, horizon and ground in screen space, from where the camera points.
  const { focal, yaw: camYaw } = lens(cam, height);
  const fdir = Math.hypot(cam.look[0] - pos[0], cam.look[1] - pos[1]) || 1;
  const far: V = [
    pos[0] + ((cam.look[0] - pos[0]) / fdir) * 1e5,
    pos[1] + ((cam.look[1] - pos[1]) / fdir) * 1e5,
    pos[2],
  ];
  const hy = projectPoint(far, cam, width, height)?.[1] ?? -height;
  const bearingX = (bearing: number) => {
    let diff = bearing - camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < 1.35 ? width / 2 - Math.tan(diff) * focal : null;
  };
  const maxWeek = Math.max(1, ...year.byWeek.map((v) => v ?? 0));
  const fog = {
    color: HAZE,
    near: Math.max(20, radius * 1.5),
    far: Math.max(20, radius * 1.5) + 30,
  };

  const icons = garden.trees
    .slice(0, 3)
    .map((t) => languageIcon(t.name))
    .filter((x): x is string => !!x);
  const BIG = Math.max(width, height) * 2;

  return (
    <AbsoluteFill style={{ backgroundColor: SKY, fontFamily, overflow: "hidden" }}>
      {icons.map((x) => (
        <Img
          key={x}
          src={staticFile(x)}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, transform: `rotate(${roll}deg) scale(1.1)` }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
          aria-hidden
        >
          {/* Sky: flat night, stars and a moon that turn with the camera. */}
          <rect x={-BIG} y={-BIG} width={BIG * 3} height={BIG + hy} fill={SKY} />
          {Array.from({ length: 60 }, (_, k) => {
            const x = bearingX(random(`sb${k}`) * Math.PI * 2);
            if (x === null) return null;
            const y = hy - Math.tan(0.05 + random(`se${k}`) * 0.6) * focal;
            const size = k % 5 === 0 ? 5 : 3;
            return (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: spike
                key={k}
                x={x}
                y={y}
                width={size}
                height={size}
                fill={k % 7 === 0 ? "#7ee08f" : "#c9d1d9"}
                opacity={0.5 + 0.5 * Math.abs(Math.sin(frame / (11 + (k % 5)) + k))}
              />
            );
          })}
          {(() => {
            const x = bearingX(0.5);
            if (x === null) return null;
            const y = hy - Math.tan(0.34) * focal;
            const r = focal * 0.045;
            return (
              <g>
                <circle cx={x} cy={y} r={r} fill="#d2f5da" />
                <circle cx={x + r * 0.42} cy={y - r * 0.2} r={r * 0.82} fill={SKY} />
              </g>
            );
          })()}
          {/* The far skyline: every week of the year as a tower, all the way round the horizon. */}
          {Array.from({ length: 120 }, (_, k) => {
            const x = bearingX((k / 120) * Math.PI * 2);
            if (x === null) return null;
            const wk = year.byWeek[(k * 7) % 53] ?? 0;
            const w = focal * 0.042;
            const hgt = focal * (0.012 + (wk / maxWeek) * 0.07);
            return (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: spike
                key={k}
                x={x - w / 2}
                y={hy - hgt}
                width={w}
                height={hgt + 2}
                fill={k % 3 === 0 ? "#1b2f25" : "#16261e"}
              />
            );
          })}
          <rect x={-BIG} y={hy} width={BIG * 3} height={BIG * 2} fill={GROUND} />
          <rect x={-BIG} y={hy} width={BIG * 3} height={Math.max(2, focal * 0.012)} fill={HAZE} />
          {renderScene(ground, cam, width, height, fog)}
          {renderScene(objs, cam, width, height, fog)}
          {/* Speed streaks fly out from where the rail disappears. */}
          {riding &&
            speed > 0.1 &&
            (() => {
              const v = projectPoint(at(ts + 40, 0, 1), cam, width, height) ?? [
                width / 2,
                height / 2,
                1,
              ];
              return Array.from({ length: 26 }, (_, k) => {
                const a = random(`sa${k}`) * Math.PI * 2;
                const t =
                  (frame * (0.02 + random(`sv${k}`) * 0.03) * (1 + speed * 3) + random(`so${k}`)) %
                  1;
                const r0 = unit * (0.25 + t * 0.9);
                const r1 = r0 + unit * 0.12 * Math.min(1, speed / 0.35) * (0.5 + t);
                return (
                  <line
                    // biome-ignore lint/suspicious/noArrayIndexKey: spike
                    key={k}
                    x1={v[0] + Math.cos(a) * r0}
                    y1={v[1] + Math.sin(a) * r0}
                    x2={v[0] + Math.cos(a) * r1}
                    y2={v[1] + Math.sin(a) * r1}
                    stroke="#e6edf3"
                    strokeOpacity={Math.min(0.4, speed) * t}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              });
            })()}
        </svg>
      </div>
    </AbsoluteFill>
  );
}
