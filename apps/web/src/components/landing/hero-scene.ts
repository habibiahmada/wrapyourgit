import type { RecapData } from "@wyg/schema";
import { buildCity, plotHeight } from "@wyg/video/city";
import { heatLevels } from "@wyg/video/heat";
import { type Box, iso, type Pane, TONES, type Tone, type Vec, viewBoxOf } from "./iso";

/** Weeks of the year shown on the hero's slab: a quarter, around the busiest day. */
export const HERO_WEEKS = 13;
const FOOT = 0.84;
/** The story's heights read as towers; the hero keeps them lower so the slab reads first. */
const HEIGHT_SCALE = 0.55;
const ZERO_HEIGHT = 0.06;

const ROOFS = ["#0e4429", "#006d32", "#26a641", "#39d353"] as const;

/** How far the ground runs past the quarter on its two near sides: pavement, a road, a kerb. */
const STREET = 2.6;
/** The far edge of the ground along each axis, and where the roads begin. */
const EDGE_X = HERO_WEEKS - 0.3 + STREET;
const EDGE_Y = 6.7 + STREET;
const ROAD_X = HERO_WEEKS + 0.1;
const ROAD_Y = 7.1;
const ROAD_WIDE = 1.4;

const ROAD: Tone = { top: "#262c36", left: "#161b22", right: "#11161d" };
const PAVE: Tone = { top: "#30363d", left: "#21262d", right: "#181d24" };
const MARK: Tone = { top: "#8b949e", left: "#6e7681", right: "#545d68" };
const STEEL: Tone = { top: "#6e7681", left: "#545d68", right: "#444c56" };
const WOOD: Tone = { top: "#5c4a3a", left: "#4a3b2e", right: "#3c3025" };
const LEAF: Tone = { top: "#2ea043", left: "#1f7a3a", right: "#196c2e" };
const LEAF_TOP: Tone = { top: "#3fb950", left: "#238636", right: "#1a7f37" };
const LAMP: Tone = { top: "#f2cc60", left: "#e3b341", right: "#bb8f2a" };
const PAINTS: Tone[] = [
  { top: "#79c0ff", left: "#388bfd", right: "#1f6feb" },
  { top: "#f5d36b", left: "#e3b341", right: "#bb8f2a" },
  { top: "#f0f6fc", left: "#c9d1d9", right: "#aab4bf" },
  { top: "#ff7b72", left: "#da3633", right: "#b62324" },
  { top: "#5eead4", left: "#2dd4bf", right: "#1fa896" },
  { top: "#c4b5fd", left: "#a78bfa", right: "#8468d8" },
];
const GLASS = "#0d1117";
const WINDOW_LIT = "#f2cc60";
const WINDOW_GREEN = "#56d364";

/** The same number for the same input, 0 to 1: which windows are lit never changes between renders. */
const chance = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Lit windows on a tower's two near faces, a storey at a time, only above the roof of the tower
 * that stands in front of that face: a window behind a nearer tower would never be seen.
 */
function windows(seed: number, tall: number, frontLeft: number, frontRight: number): Pane[] {
  const panes: Pane[] = [];
  for (let floor = 0; 0.28 + floor * 0.36 + 0.16 < tall - 0.08; floor++) {
    const z0 = 0.28 + floor * 0.36;
    for (const [face, over] of [
      ["left", frontLeft],
      ["right", frontRight],
    ] as const) {
      if (z0 < over) continue;
      [0.16, 0.6].forEach((u, k) => {
        const roll = chance(seed * 7.3 + floor * 3.1 + k + (face === "left" ? 0 : 0.5));
        if (roll > 0.52) return;
        panes.push({
          face,
          u: [u, u + 0.24],
          z: [z0, z0 + 0.16],
          fill: roll < 0.4 ? WINDOW_LIT : WINDOW_GREEN,
        });
      });
    }
  }
  return panes;
}

/** A car on a road: its body and its cabin with dark glass, heading along `along`. */
function car(x: number, y: number, along: "x" | "y", paint: Tone): Box[] {
  const long = 0.95;
  const wide = 0.44;
  const z = 0.06;
  const glass: Pane[] = [
    { face: "left", u: [0.1, 0.9], z: [0.03, 0.14], fill: GLASS },
    { face: "right", u: [0.1, 0.9], z: [0.03, 0.14], fill: GLASS },
  ];
  return along === "x"
    ? [
        { at: [x, y, z], size: [long, wide, 0.2], tone: paint },
        {
          at: [x + long * 0.22, y + 0.04, z + 0.2],
          size: [long * 0.5, wide - 0.08, 0.17],
          tone: paint,
          panes: glass,
        },
      ]
    : [
        { at: [x, y, z], size: [wide, long, 0.2], tone: paint },
        {
          at: [x + 0.04, y + long * 0.22, z + 0.2],
          size: [wide - 0.08, long * 0.5, 0.17],
          tone: paint,
          panes: glass,
        },
      ];
}

/** A street tree on a kerb: a trunk and two tiers of leaves. */
function tree(x: number, y: number): Box[] {
  const z = 0.03;
  return [
    { at: [x - 0.06, y - 0.06, z], size: [0.12, 0.12, 0.22], tone: WOOD, edge: false },
    { at: [x - 0.27, y - 0.27, z + 0.22], size: [0.54, 0.54, 0.36], tone: LEAF },
    { at: [x - 0.17, y - 0.17, z + 0.58], size: [0.34, 0.34, 0.3], tone: LEAF_TOP },
  ];
}

/** A street lamp: a pole, an arm out over the road, and its light under the arm's end. */
function lamp(x: number, y: number, over: "x" | "y"): Box[] {
  const z = 0.03;
  return [
    { at: [x - 0.03, y - 0.03, z], size: [0.06, 0.06, 0.95], tone: STEEL, edge: false },
    over === "y"
      ? { at: [x - 0.03, y - 0.03, z + 0.95], size: [0.06, 0.42, 0.06], tone: STEEL, edge: false }
      : { at: [x - 0.03, y - 0.03, z + 0.95], size: [0.42, 0.06, 0.06], tone: STEEL, edge: false },
    over === "y"
      ? { at: [x - 0.06, y + 0.25, z + 0.87], size: [0.12, 0.14, 0.05], tone: LAMP, edge: false }
      : { at: [x + 0.25, y - 0.06, z + 0.87], size: [0.14, 0.12, 0.05], tone: LAMP, edge: false },
  ];
}

/**
 * The streets round the quarter's two near sides: pavements, two roads with their centre lines
 * and a crossing where they meet, cars, street trees on the outer kerbs and lamps on the inner.
 */
function streets(): Box[] {
  const out: Box[] = [
    // Pavements between the city and the roads, then the roads, then the outer kerbs.
    { at: [-0.7, 6.62, 0], size: [ROAD_X + 0.7, ROAD_Y - 6.62, 0.03], tone: PAVE },
    { at: [ROAD_X - 0.48, -0.7, 0], size: [0.48, 7.32, 0.03], tone: PAVE },
    { at: [-0.7, ROAD_Y, 0], size: [EDGE_X + 0.7, ROAD_WIDE, 0.04], tone: ROAD },
    { at: [ROAD_X, -0.7, 0], size: [ROAD_WIDE, ROAD_Y + 0.7, 0.04], tone: ROAD },
    { at: [-0.7, ROAD_Y + ROAD_WIDE, 0], size: [EDGE_X + 0.7, 0.8, 0.03], tone: PAVE },
    { at: [ROAD_X + ROAD_WIDE, -0.7, 0], size: [0.8, ROAD_Y + 0.7, 0.03], tone: PAVE },
  ];
  // Centre lines, and the crossing's stripes before the corner.
  for (let x = -0.3; x < ROAD_X - 1.6; x += 1.2) {
    out.push({
      at: [x, ROAD_Y + ROAD_WIDE / 2 - 0.03, 0.04],
      size: [0.5, 0.06, 0.012],
      tone: MARK,
      edge: false,
    });
  }
  for (let y = -0.3; y < ROAD_Y - 1.0; y += 1.2) {
    out.push({
      at: [ROAD_X + ROAD_WIDE / 2 - 0.03, y, 0.04],
      size: [0.06, 0.5, 0.012],
      tone: MARK,
      edge: false,
    });
  }
  for (let k = 0; k < 4; k++) {
    out.push({
      at: [ROAD_X - 1.3 + k * 0.26, ROAD_Y + 0.15, 0.04],
      size: [0.12, ROAD_WIDE - 0.3, 0.012],
      tone: MARK,
      edge: false,
    });
  }
  // Traffic: two lanes on each road.
  const near = ROAD_Y + ROAD_WIDE / 2 + 0.13;
  const far = ROAD_Y + 0.13;
  [0.6, 4.9, 9.2].forEach((x, i) => {
    out.push(...car(x, far, "x", PAINTS[i % PAINTS.length] ?? MARK));
  });
  [2.7, 7.0, 14.0].forEach((x, i) => {
    out.push(...car(x, near, "x", PAINTS[(i + 3) % PAINTS.length] ?? MARK));
  });
  [0.2, 3.6].forEach((y, i) => {
    out.push(...car(ROAD_X + 0.13, y, "y", PAINTS[(i + 1) % PAINTS.length] ?? MARK));
  });
  out.push(...car(ROAD_X + ROAD_WIDE / 2 + 0.13, 1.9, "y", PAINTS[4] ?? MARK));
  out.push(...car(ROAD_X + ROAD_WIDE / 2 + 0.13, 5.2, "y", PAINTS[0] ?? MARK));
  // Trees on the outer kerbs, lamps on the inner pavements.
  for (let x = 0.1; x < EDGE_X - 0.4; x += 1.55) out.push(...tree(x, ROAD_Y + ROAD_WIDE + 0.4));
  for (let y = 0.1; y < ROAD_Y - 0.3; y += 1.55) out.push(...tree(ROAD_X + ROAD_WIDE + 0.4, y));
  for (const x of [1.5, 4.5, 7.5, 10.5]) out.push(...lamp(x, 6.86, "y"));
  for (const y of [1.5, 4.5]) out.push(...lamp(ROAD_X - 0.24, y, "x"));
  return out;
}

export type HeroScene = {
  boxes: Box[];
  viewBox: string;
  /** World points: the busiest roof (Cell stands there), the slab's link anchors, the modules. */
  busiest: Vec | null;
  links: { from: Vec; to: Vec }[];
  modules: { kind: "languages" | "stars" | "letter"; top: Vec }[];
  /** First and last week shown, for the caption. */
  weeks: [number, number];
};

/** Dark sides, the day's green on the roof; the busiest building green all over. */
const tone = (roof: string, lit: boolean): Tone =>
  lit ? TONES.lit : { top: roof, left: TONES.dark.left, right: TONES.dark.right };

/**
 * The hero's illustration: a quarter of a sample year as a city on a thick slab, the busiest
 * day lit, windows lit on the towers that show a face, streets with traffic, trees and lamps
 * round its two near sides, and three small modules floating around it (languages, stars, the
 * letter), linked to the slab by thin lines like parts of one system.
 */
export function heroScene(data: RecapData): HeroScene {
  const city = buildCity(data);
  const levels = heatLevels(city.plots);
  const lastCol = Math.max(0, ...city.plots.map((p) => p.col));
  const busiestPlot = city.busiestIndex === null ? null : city.plots[city.busiestIndex];
  const centre = busiestPlot?.col ?? Math.floor(lastCol / 2);
  const first = Math.max(
    0,
    Math.min(lastCol - HERO_WEEKS + 1, centre - Math.floor(HERO_WEEKS / 2)),
  );
  const last = first + HERO_WEEKS - 1;

  const boxes: Box[] = [];
  // The slab: the ground the quarter stands on, one tile of margin around it.
  boxes.push({
    at: [-0.7, -0.7, -1.3],
    size: [EDGE_X + 0.7, EDGE_Y + 0.7, 1.3],
    tone: TONES.deep,
  });
  boxes.push(...streets());

  /** How tall the tower on a plot of the quarter is: 0 for an empty day or outside it. */
  const heights = new Map<string, number>();
  for (const plot of city.plots) {
    if (plot.col < first || plot.col > last || plot.state !== "active") continue;
    heights.set(`${plot.col},${plot.row}`, plotHeight(plot, city.maxCount) * HEIGHT_SCALE);
  }

  let busiest: Vec | null = null;
  for (const plot of city.plots) {
    if (plot.col < first || plot.col > last) continue;
    const x = plot.col - first - FOOT / 2;
    const y = plot.row - FOOT / 2;
    if (plot.state !== "active") {
      boxes.push({ at: [x, y, 0], size: [FOOT, FOOT, ZERO_HEIGHT], tone: TONES.dark });
      continue;
    }
    const h = plotHeight(plot, city.maxCount) * HEIGHT_SCALE;
    const lit = plot.index === city.busiestIndex;
    const roof = ROOFS[(levels[plot.index] ?? 1) - 1] ?? ROOFS[0];
    boxes.push({
      at: [x, y, 0],
      size: [FOOT, FOOT, h],
      tone: tone(roof, lit),
      // The busiest building is green all over: its light is its own.
      panes: lit
        ? undefined
        : windows(
            plot.index,
            h,
            heights.get(`${plot.col},${plot.row + 1}`) ?? 0,
            heights.get(`${plot.col + 1},${plot.row}`) ?? 0,
          ),
    });
    if (lit) busiest = [x + FOOT / 2, y + FOOT / 2, h];
  }

  // Three modules around the slab: behind-left, behind-right and front-right, clear of the city.
  const moduleBoxes: { kind: HeroScene["modules"][number]["kind"]; at: Vec; size: Vec }[] = [
    { kind: "languages", at: [-6.2, -4.2, 2.6], size: [2.6, 2.6, 0.5] },
    { kind: "stars", at: [HERO_WEEKS + 0.6, -5.6, 2.8], size: [2.4, 2.4, 0.5] },
    { kind: "letter", at: [HERO_WEEKS + 5.2, 5.4, 0.4], size: [3, 2.2, 0.45] },
  ];
  const modules = moduleBoxes.map(({ kind, at, size }) => {
    boxes.push({ at, size, tone: TONES.dark });
    const top: Vec = [at[0] + size[0] / 2, at[1] + size[1] / 2, at[2] + size[2]];
    return { kind, top, base: [top[0], top[1], at[2]] as Vec };
  });

  // Language bars on their module: three heights, the greens from most to least.
  const lang = moduleBoxes[0];
  if (lang) {
    [1.1, 0.75, 0.5].forEach((height, i) => {
      boxes.push({
        at: [lang.at[0] + 0.35 + i * 0.7, lang.at[1] + 0.9, lang.at[2] + lang.size[2]],
        size: [0.5, 0.8, height],
        tone: [TONES.lit, TONES.mid, TONES.low][i] ?? TONES.low,
      });
    });
  }

  // Links from the slab's edges up to each module's underside.
  const anchors: Vec[] = [
    [-0.7, -0.7, -0.4],
    [HERO_WEEKS - 0.3, -0.7, -0.4],
    [EDGE_X, 6.4, -0.6],
  ];
  const links = modules.map((m, i) => ({ from: anchors[i] ?? [0, 0, 0], to: m.base }));

  const extra: Vec[] = busiest ? [[busiest[0], busiest[1], busiest[2] + 2.6]] : [];
  return {
    boxes,
    viewBox: viewBoxOf(boxes, extra, 0.8),
    busiest,
    links,
    modules: modules.map(({ kind, top }) => ({ kind, top })),
    weeks: [first, last],
  };
}

/** Screen-space path of a straight world line, for the links. */
export function linePath(from: Vec, to: Vec): string {
  const [ax, ay] = iso(from);
  const [bx, by] = iso(to);
  return `M${ax.toFixed(3)} ${ay.toFixed(3)}L${bx.toFixed(3)} ${by.toFixed(3)}`;
}
