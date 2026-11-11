import type { RecapData } from "@wyg/schema";
import { buildCity, plotHeight } from "@wyg/video/city";
import { heatLevels } from "@wyg/video/heat";
import { type Box, iso, TONES, type Tone, type Vec, viewBoxOf } from "./iso";

/** Weeks of the year shown on the hero's slab: a quarter, around the busiest day. */
export const HERO_WEEKS = 13;
const FOOT = 0.84;
/** The story's heights read as towers; the hero keeps them lower so the slab reads first. */
const HEIGHT_SCALE = 0.55;
const ZERO_HEIGHT = 0.06;

const ROOFS = ["#0e4429", "#006d32", "#26a641", "#39d353"] as const;

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
 * day lit, and three small modules floating around it (languages, stars, the letter), linked to
 * the slab by thin lines like parts of one system.
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
  boxes.push({ at: [-0.7, -0.7, -1.3], size: [HERO_WEEKS + 0.4, 7.4, 1.3], tone: TONES.deep });

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
    boxes.push({ at: [x, y, 0], size: [FOOT, FOOT, h], tone: tone(roof, lit) });
    if (lit) busiest = [x + FOOT / 2, y + FOOT / 2, h];
  }

  // Three modules around the slab: behind-left, behind-right and front-right, clear of the city.
  const moduleBoxes: { kind: HeroScene["modules"][number]["kind"]; at: Vec; size: Vec }[] = [
    { kind: "languages", at: [-6.2, -4.2, 2.6], size: [2.6, 2.6, 0.5] },
    { kind: "stars", at: [HERO_WEEKS + 0.6, -5.6, 2.8], size: [2.4, 2.4, 0.5] },
    { kind: "letter", at: [HERO_WEEKS + 2.6, 5.2, 0.4], size: [3, 2.2, 0.45] },
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
    [HERO_WEEKS - 0.3, 5.2, -0.6],
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
