import { random } from "remotion";
import type { StopKind } from "../../stops";
import { TONE, toneOf } from "../palette";
import type { Decal, FaceName, Solid } from "../prims";
import { part, type StationContext } from "./kit";

/*
 * The town round a station's plaza: a street behind it with traffic, a row of buildings with
 * lit windows, street trees and lamps, and a kiosk. It gives every stop a place to be in, the way
 * the landing's city blocks do (ADR-0022), and it is drawn live, so it is built to cost little:
 * a building or a car is one box, and its windows, wheels and lights are painted on its faces.
 * Painted detail adds no box to sort, and small boxes that touch sort wrongly (train.ts).
 *
 * Nothing here stands between the rail and the plaza, or at the plaza's end the camera looks
 * from: a hero is never behind scenery. None of it carries a tag the camera frames, and none of
 * it prints a word: the numbers stay the station's own.
 */

/** A storey's height, and how tall its band of glass is. */
const FLOOR = 0.62;
const GLASS_TALL = 0.34;
const GLASS = "#16202e";
const WARM = "#ffd866";
const COOL = "#9ecbff";
const ROOF = "#21262d";
const ROAD = toneOf("#262c36");
const KERB = toneOf("#343c47");
const PAINTS = ["#388bfd", "#e3b341", "#c9d1d9", "#da3633", "#2dd4bf", "#a78bfa"];
/**
 * How far into the climb to the overview (StationContext.overview, 0 to 1) the fine paint is
 * still drawn: glass, wheels, road marks. Past it they are too small to see, and all the towns
 * are in the picture at once, so leaving them out keeps the frame inside its polygon budget.
 */
const NEAR = 0.35;

/** How far behind the plaza's far edge each strip lies. */
const STREET = { from: 0.5, to: 2.0 };
const VERGE = 2.45;
const ROW = { from: 2.95, deep: 2.5 };

type Mark = "clock" | "sign" | "shutter" | "beacon" | "awning" | "glass";
type Theme = {
  /** The colours of the row's walls, in turn. */
  walls: string[];
  /** The fewest and the most storeys a building of the row has. */
  floors: [number, number];
  /** The share of windows that are lit. */
  lit: number;
  /** Lit panes are blue-white instead of warm: where the hero itself is gold. */
  cool?: boolean;
  /** What sets the middle building apart, and its colour. */
  mark: Mark;
  accent: string;
};

/** Each stop's town: what kind of quarter its chapter would be in. */
const THEMES: Partial<Record<StopKind, Theme>> = {
  // A quiet street with a glasshouse: where something was planted.
  "first-day": {
    walls: ["#2f5d50", "#3b4a5c", "#4a5568"],
    floors: [2, 4],
    lit: 0.3,
    mark: "glass",
    accent: "#7ee787",
  },
  // Banks: dark fronts, few lights, a gold name band.
  private: {
    walls: ["#232b3d", "#2d333b", "#1f2a44"],
    floors: [3, 6],
    lit: 0.16,
    mark: "sign",
    accent: "#e3b341",
  },
  // Offices lit late.
  busiest: {
    walls: ["#30476b", "#3d2f5c", "#2d4a5a"],
    floors: [4, 7],
    lit: 0.62,
    mark: "beacon",
    accent: "#ff7b72",
  },
  // A town hall with its clock.
  rhythm: {
    walls: ["#4a3f6b", "#30476b", "#3b4a5c"],
    floors: [3, 6],
    lit: 0.35,
    mark: "clock",
    accent: "#f0f6fc",
  },
  // A school quarter.
  languages: {
    walls: ["#5b4a8a", "#30476b", "#2f5d50"],
    floors: [3, 6],
    lit: 0.4,
    mark: "sign",
    accent: "#79c0ff",
  },
  // Warehouses with roller doors.
  projects: {
    walls: ["#6b4a3a", "#4a535e", "#5a4634"],
    floors: [2, 4],
    lit: 0.25,
    mark: "shutter",
    accent: "#ff9a5c",
  },
  // Cafés under awnings. The stars over the observatory are gold, so the windows are not.
  community: {
    walls: ["#8a3d63", "#30476b", "#5b4a8a"],
    floors: [3, 6],
    lit: 0.3,
    cool: true,
    mark: "awning",
    accent: "#ff7ab6",
  },
  // The airfield's buildings, a light on the tallest.
  engineering: {
    walls: ["#3b4a5c", "#2d4a5a", "#4a535e"],
    floors: [2, 5],
    // Few lights: the planes fly in front of these walls.
    lit: 0.18,
    mark: "beacon",
    accent: "#79c0ff",
  },
  // A sports quarter.
  versus: {
    walls: ["#4a535e", "#30476b", "#6b4a3a"],
    floors: [3, 6],
    lit: 0.35,
    mark: "sign",
    accent: "#56d364",
  },
};

/** What the middle building wears on the face it turns to the rail. */
function markDecals(
  mark: Mark,
  accent: string,
  face: FaceName,
  wide: number,
  tall: number,
): Decal[] {
  const v = (z: number) => Math.max(0, Math.min(1, z / tall));
  const u = (x: number) => 0.5 + x / wide;
  switch (mark) {
    case "clock":
      return [
        {
          on: face,
          rect: [u(-0.5), v(tall - 1.25), u(0.5), v(tall - 0.25)],
          fill: accent,
          round: true,
        },
        { on: face, rect: [u(-0.04), v(tall - 0.75), u(0.04), v(tall - 0.36)], fill: "#0d1117" },
        { on: face, rect: [u(0), v(tall - 0.79), u(0.3), v(tall - 0.71)], fill: "#da3633" },
      ];
    case "sign":
      return [
        { on: face, rect: [0.14, v(tall - 0.72), 0.86, v(tall - 0.28)], fill: "#0d1117" },
        { on: face, rect: [0.18, v(tall - 0.64), 0.82, v(tall - 0.36)], fill: accent },
      ];
    case "shutter":
      return [
        { on: face, rect: [0.2, 0, 0.8, v(1.25)], fill: "#8b949e" },
        ...[0.25, 0.5, 0.75, 1.0].map(
          (z): Decal => ({ on: face, rect: [0.2, v(z), 0.8, v(z + 0.05)], fill: "#545d68" }),
        ),
        { on: face, rect: [0.2, v(1.25), 0.8, v(1.4)], fill: accent },
      ];
    case "awning":
      return Array.from(
        { length: 8 },
        (_, k): Decal => ({
          on: face,
          rect: [0.1 + k * 0.1, v(0.62), 0.2 + k * 0.1, v(0.98)],
          fill: k % 2 === 0 ? accent : "#f0f6fc",
        }),
      );
    case "glass":
      return [
        { on: face, rect: [0.1, v(0.2), 0.9, v(tall - 0.2)], fill: "#1d3b33" },
        ...[0.3, 0.5, 0.7].map(
          (x): Decal => ({
            on: face,
            rect: [x - 0.012, v(0.2), x + 0.012, v(tall - 0.2)],
            fill: accent,
          }),
        ),
        { on: face, rect: [0.1, v(tall * 0.55), 0.9, v(tall * 0.55 + 0.05)], fill: accent },
      ];
    case "beacon":
      return [];
  }
}

/** One building: a box with a band of glass to each storey, some panes lit, and a roof. */
function building(
  ctx: StationContext,
  dx: number,
  dy: number,
  size: [number, number],
  floors: number,
  wall: string,
  lit: number,
  seed: string,
  cool: boolean,
  extra: Decal[] = [],
): Solid {
  const far = ctx.overview;
  const [wide, deep] = size;
  const tall = floors * FLOOR + 0.3;
  const cols = Math.max(3, Math.round(wide / 0.46));
  const decals: Decal[] = [];
  for (let floor = 0; floor < floors; floor++) {
    const v0 = (0.24 + floor * FLOOR) / tall;
    const v1 = (0.24 + floor * FLOOR + GLASS_TALL) / tall;
    // Dark glass cannot be told from its wall from high over the year, and the lit panes go
    // out a few at a time as the camera climbs: no window is there one frame and gone the next.
    if (far < NEAR) decals.push({ on: "all", rect: [0.08, v0, 0.92, v1], fill: GLASS });
    for (let k = 0; k < cols; k++) {
      const roll = random(`${seed}-${floor}-${k}`);
      if (roll > lit * (1 - far)) continue;
      const u0 = 0.1 + (k * 0.8) / cols;
      decals.push({
        on: "all",
        rect: [u0 + 0.012, v0, u0 + 0.8 / cols - 0.012, v1],
        fill: cool || roll > lit * 0.82 ? COOL : WARM,
      });
    }
  }
  decals.push(
    { on: "top", rect: [0.06, 0.06, 0.94, 0.94], fill: ROOF },
    ...(far < NEAR
      ? [{ on: "top", rect: [0.58, 0.56, 0.86, 0.84], fill: "#6e7681" } satisfies Decal]
      : []),
    ...(far < NEAR
      ? [{ on: "top", rect: [0.14, 0.2, 0.34, 0.36], fill: "#444c56" } satisfies Decal]
      : []),
    ...extra,
  );
  return part(ctx.c, ctx.yaw, dx, dy, 0, [wide, deep, tall], toneOf(wall), {
    tag: "scenery",
    decals,
  });
}

/** A van on the street, one box: glass, wheels and lights are painted on. `long` runs along the rail. */
function van(ctx: StationContext, dx: number, dy: number, long: number, paint: string): Solid {
  const tall = long > 2 ? 0.86 : 0.64;
  const wheel = (u: number): Decal => ({
    on: "sides",
    rect: [u, 0, u + 0.26 / long, 0.26 / tall],
    fill: "#0d1117",
    round: true,
  });
  return part(ctx.c, ctx.yaw, dx, dy, 0.07, [long, 0.72, tall], toneOf(paint), {
    tag: "scenery",
    decals:
      ctx.overview >= NEAR
        ? []
        : [
            { on: "all", rect: [0.07, 0.5, 0.93, 0.86], fill: "#0d1117" },
            wheel(0.1),
            wheel(0.9 - 0.26 / long),
            { on: "front", rect: [0.1, 0.16, 0.3, 0.36], fill: WARM },
            { on: "front", rect: [0.7, 0.16, 0.9, 0.36], fill: WARM },
            { on: "back", rect: [0.1, 0.16, 0.28, 0.34], fill: "#da3633" },
            { on: "back", rect: [0.72, 0.16, 0.9, 0.34], fill: "#da3633" },
            { on: "top", rect: [0.08, 0.1, 0.92, 0.9], fill: paint },
          ],
  });
}

/** A street tree: a trunk and two tiers of leaves, like the land's own (land.ts). */
function tree(ctx: StationContext, dx: number, dy: number, s: number): Solid[] {
  const { c, yaw } = ctx;
  return [
    part(c, yaw, dx, dy, 0, [0.18 * s, 0.18 * s, 0.7 * s], TONE.soil, {
      edge: false,
      tag: "scenery",
    }),
    part(c, yaw, dx, dy, 0.7 * s, [1.1 * s, 1.1 * s, 0.8 * s], TONE.leaf, {
      tag: "scenery",
      decals:
        ctx.overview >= NEAR
          ? []
          : [{ on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: TONE.leafTop.left }],
    }),
    part(c, yaw, dx, dy, 1.5 * s, [0.7 * s, 0.7 * s, 0.55 * s], TONE.leafTop, { tag: "scenery" }),
  ];
}

/** A street lamp: a pole and its lit head. */
function lamp(ctx: StationContext, dx: number, dy: number): Solid[] {
  const { c, yaw } = ctx;
  return [
    part(c, yaw, dx, dy, 0, [0.12, 0.12, 2.1], TONE.dark, { edge: false, tag: "scenery" }),
    part(c, yaw, dx, dy, 2.1, [0.4, 0.4, 0.2], TONE.lamp, { lit: true, tag: "scenery" }),
  ];
}

/**
 * The town behind and beside the plaza of `kind`, `long` by `deep`. Behind means away from the
 * rail; the plaza's far end is the one the train heads toward, which the camera looks at, not from.
 */
export function scenery(ctx: StationContext, kind: StopKind, long: number, deep: number): Solid[] {
  const theme = THEMES[kind];
  if (!theme) return [];
  const { c, yaw, stop } = ctx;
  const away = -stop.side;
  const behind = (d: number) => away * (deep / 2 + d);
  /** The face a building turns to the rail, and so to the camera. */
  const toward: FaceName = stop.side === 1 ? "left" : "right";
  const span = long + 7;
  const out: Solid[] = [];

  // The street: a kerb on each side, the road with its centre line, and what drives on it.
  out.push(
    // The paving runs from the plaza's edge to the foot of the row.
    part(c, yaw, 0, behind((0.2 + ROW.from - 0.05) / 2), 0, [span, ROW.from - 0.25, 0.05], KERB, {
      tag: "scenery",
      under: 3,
    }),
    part(
      c,
      yaw,
      0,
      behind((STREET.from + STREET.to) / 2),
      0.05,
      [span, STREET.to - STREET.from, 0.02],
      ROAD,
      {
        tag: "scenery",
        under: 2,
        edge: false,
        decals:
          ctx.overview >= NEAR
            ? []
            : Array.from(
                { length: 9 },
                (_, k): Decal => ({
                  on: "top",
                  rect: [0.04 + k * 0.105, 0.47, 0.1 + k * 0.105, 0.53],
                  fill: "#8b949e",
                }),
              ),
      },
    ),
  );
  const lanes = [STREET.from + 0.42, STREET.to - 0.42];
  [-0.34, 0.08, 0.4].forEach((share, k) => {
    const paint = PAINTS[Math.floor(random(`${kind}-van-${k}`) * PAINTS.length)] ?? "#c9d1d9";
    out.push(
      van(ctx, share * span, behind(lanes[k % 2] ?? lanes[0] ?? 1), k === 1 ? 2.3 : 1.5, paint),
    );
  });

  // The row: five buildings side by side, the middle one this stop's own.
  const widths = [2.3, 2.7, 3.0, 2.5, 2.2].map((w, k) => w + random(`${kind}-wide-${k}`) * 0.5);
  const gap = (span - widths.reduce((sum, w) => sum + w, 0)) / (widths.length + 1);
  let x = -span / 2 + gap;
  widths.forEach((wide, k) => {
    const [low, high] = theme.floors;
    const middle = k === 2;
    const floors = middle
      ? high
      : low + Math.floor(random(`${kind}-floors-${k}`) * (high - low + 1));
    const tall = floors * FLOOR + 0.3;
    const dx = x + wide / 2;
    const dy = behind(ROW.from + ROW.deep / 2);
    out.push(
      building(
        ctx,
        dx,
        dy,
        [wide, ROW.deep],
        floors,
        theme.walls[k % theme.walls.length] ?? "#3b4a5c",
        theme.lit,
        `${kind}-${k}`,
        theme.cool ?? false,
        middle ? markDecals(theme.mark, theme.accent, toward, wide, tall) : [],
      ),
    );
    if (middle && theme.mark === "beacon") {
      out.push(
        part(c, yaw, dx, dy, tall, [0.12, 0.12, 0.7], TONE.dark, { edge: false, tag: "scenery" }),
        part(c, yaw, dx, dy, tall + 0.7, [0.26, 0.26, 0.22], toneOf(theme.accent), {
          lit: true,
          tag: "scenery",
        }),
      );
    }
    x += wide + gap;
  });

  // Trees and lamps on the verge before the row, and a few at the plaza's far end.
  for (let k = 0; k < 5; k++) {
    const dx = -span / 2 + ((k + 0.5) * span) / 5;
    const s = 0.6 + random(`${kind}-tree-${k}`) * 0.2;
    if (k % 2 === 0) out.push(...tree(ctx, dx, behind(VERGE), s));
    else out.push(...lamp(ctx, dx, behind(VERGE)));
  }
  for (const t of [-1.3, 0.4]) out.push(...tree(ctx, long / 2 + 1.5, away * t, 0.75));

  // A kiosk at the far end, by the street: its counter, and a striped canopy painted on.
  out.push(
    part(c, yaw, long / 2 + 1.6, behind(-0.75), 0, [1.3, 1.1, 1.05], toneOf("#3b4a5c"), {
      tag: "scenery",
      decals: [
        ...(ctx.overview >= NEAR
          ? []
          : Array.from(
              { length: 6 },
              (_, k): Decal => ({
                on: "all",
                rect: [k / 6, 0.72, (k + 1) / 6, 1],
                fill: k % 2 === 0 ? theme.accent : "#f0f6fc",
              }),
            )),
        ...(ctx.overview >= NEAR
          ? []
          : [{ on: "all", rect: [0.14, 0.3, 0.86, 0.66], fill: "#0d1117" } satisfies Decal]),
        { on: "top", rect: [0.05, 0.05, 0.95, 0.95], fill: theme.accent },
      ],
    }),
  );
  return out;
}
