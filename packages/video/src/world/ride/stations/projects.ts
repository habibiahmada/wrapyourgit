import type { LayoutFamily } from "@wyg/schema";
import { formatCount } from "../../../theme";
import { commitsText, projectsModel } from "../../scenes/projects.model";
import { TONE } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { clip, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

const BASE = 0.14;
const CRATE_SIDE = 1.4;
/** How tall a crate is. A frame with less height gets flatter crates, so a tower of eight still fits. */
const CRATE_TALL: Record<LayoutFamily, number> = { portrait: 0.55, landscape: 0.55, compact: 0.35 };
/** Between towers that stand in a row with a plaque in front of each. */
const SPACING = 3.7;
/** Between towers that stand together on a tier behind a wall of plaques. */
const CLOSE = 1.8;
/** How high that tier lifts the towers, so they show over the wall. */
const TIER = 2.5;
/** A plaque is wide enough for a 14-letter name at a size that reads. */
const PLAQUE_WIDE = 3.5;
/** A plaque's rows, in world units from its top. The first repository's plaque is the large one. */
const LARGE = { tall: 1.95, name: [0.1, 0.56], figure: [0.62, 1.47], unit: [1.51, 1.85] } as const;
const SMALL = { tall: 1.5, name: [0.1, 0.56], figure: [0.6, 1.14], unit: [1.16, 1.42] } as const;
const FRAME: Decal[] = [
  { on: "all", rect: [0, 0, 1, 0.16], fill: "#6f5238" },
  { on: "all", rect: [0, 0.84, 1, 1], fill: "#6f5238" },
  { on: "all", rect: [0, 0, 0.1, 1], fill: "#6f5238" },
  { on: "all", rect: [0.9, 0, 1, 1], fill: "#6f5238" },
  { on: "all", rect: [0.1, 0.47, 0.9, 0.53], fill: "#7d5d40" },
  { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: "#b08a61" },
];
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
const line = (
  [top, bottom]: readonly [number, number],
  tall: number,
): [number, number, number, number] => [0.03, 1 - bottom / tall, 0.97, 1 - top / tall];

/**
 * One tower of crates per repository, and a plaque for each carrying the repository and its
 * commits. Crates drop one after another; the figure on the plaque rises with them and is exact
 * when the train stops. A plaque appears with its tower, so it never reads zero.
 *
 * In a wide frame the towers stand in a row with a plaque in front of each. A narrow frame has no
 * room for four plaques side by side at a size that reads, so there the plaques make a wall, two
 * across, and the towers stand close together on a tier behind it.
 */
export const projects: Station = (ctx) => {
  const { data, c, yaw, build, stop, layout } = ctx;
  const model = projectsModel(data);
  const note = [model.subtitle, model.legend].filter(Boolean).join(" · ");

  if (model.empty) {
    // An empty shelf is not zero commits to show: the bases stand shuttered, and the board says so.
    const out: Solid[] = plaza(ctx);
    for (const slot of [-1, 0, 1]) {
      out.push(
        part(c, yaw, slot * 2.6, 0, PLAZA_TOP, [1.7, 1.7, 0.9], TONE.dark, {
          tag: "shuttered",
          decals: [0.2, 0.4, 0.6, 0.8].map(
            (v): Decal => ({ on: "all", rect: [0.1, v - 0.03, 0.9, v + 0.03], fill: "#545d68" }),
          ),
        }),
      );
    }
    out.push(
      ...nameBoard(ctx, ["Repositories", model.title], {
        long: PLAZA.long,
        deep: PLAZA.deep,
        front: 1.0,
      }),
    );
    return out;
  }

  const n = model.stacks.length;
  const row = layout === "landscape";
  const crate = CRATE_TALL[layout];
  const deep = row ? PLAZA.deep : 7.0;
  const long = row
    ? Math.max(PLAZA.long, (n - 1) * SPACING + PLAQUE_WIDE + 0.8)
    : Math.max(PLAZA.long, Math.min(n, 2) * (PLAQUE_WIDE + 0.2) + 1.2);
  const out: Solid[] = plaza(ctx, long, deep);
  const back = -stop.side * 1.5;
  const front = stop.side * (row ? 1.75 : 1.7);
  const ground = PLAZA_TOP + (row ? 0 : TIER);
  if (!row) {
    out.push(
      part(c, yaw, 0, back, PLAZA_TOP, [n * CLOSE + 0.8, 2.2, TIER], TONE.dark, {
        tag: "tier",
        decals: [{ on: "all", rect: [0, 0.94, 1, 1], fill: "#e3b341" }],
      }),
    );
  }
  /** Where a plaque hangs: in front of its tower in a row; in the wall, two across, otherwise. */
  const plaqueAt = (i: number): { dx: number; z: number } => {
    if (row) return { dx: (i - (n - 1) / 2) * SPACING, z: PLAZA_TOP + 0.9 };
    const columns = Math.min(n, 2);
    const col = i % 2;
    const upper = i < 2 && n > 2;
    return {
      dx: (col - (columns - 1) / 2) * (PLAQUE_WIDE + 0.2),
      // The lower row stands on short posts; the upper row's plaques share one bottom edge above it.
      z: PLAZA_TOP + 0.3 + (upper ? SMALL.tall + 0.15 : 0),
    };
  };

  model.stacks.forEach((stack, i) => {
    const dx = (i - (n - 1) / 2) * (row ? SPACING : CLOSE);
    const dy = row ? 0 : back;
    out.push(part(c, yaw, dx, dy, ground, [1.7, 1.7, BASE], TONE.dark, { tag: "base" }));
    const start = n === 1 ? 0 : 0.25 * (i / (n - 1));
    let landedCrates = 0;
    for (let k = 0; k < stack.crates; k++) {
      const delay = start + (stack.crates === 1 ? 0 : 0.45 * (k / (stack.crates - 1)));
      const landed = (build - delay) / 0.3;
      if (landed <= 0) continue;
      landedCrates += Math.min(1, landed);
      out.push(
        part(
          c,
          yaw,
          dx,
          dy,
          ground + BASE + k * crate + (1 - easeOut(landed)) * 5,
          [CRATE_SIDE, CRATE_SIDE, crate],
          TONE.wood,
          {
            tag: "crate",
            lit: true,
            decals: FRAME,
          },
        ),
      );
    }
    if (landedCrates <= 0) return;
    // The model's words on two lines: the figure large, its unit under it. Before the tower is
    // whole the figure rises with the crates (never below 1); at rest it is the exact figure.
    const [exact = "", unit = "commits"] = commitsText(stack.commits).split(" ");
    const rising = Math.max(1, Math.round(stack.commits * (landedCrates / stack.crates) * 0.9));
    const figure =
      build >= 1 ? exact : formatCount(Math.min(rising, Math.max(1, stack.commits - 1)));
    const rows = i === 0 ? LARGE : SMALL;
    const texts: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => [
      {
        on,
        rect: line(rows.name, rows.tall),
        text: clip(stack.label, 14),
        fill: "#c9d1d9",
        weight: 700,
      },
      { on, rect: line(rows.figure, rows.tall), text: figure, fill: "#ffffff" },
      { on, rect: line(rows.unit, rows.tall), text: unit, fill: "#c9d1d9", weight: 700 },
    ]);
    const at = plaqueAt(i);
    out.push(
      part(c, yaw, at.dx, front, PLAZA_TOP, [0.12, 0.12, at.z - PLAZA_TOP], TONE.dark, {
        edge: false,
        tag: "plaque-post",
      }),
    );
    out.push(
      part(c, yaw, at.dx, front, at.z, [PLAQUE_WIDE, 0.12, rows.tall], TONE.ink, {
        tag: "plaque",
        lit: true,
        texts,
        decals: [{ on: "sides", rect: [0, 0, 1, 0.04], fill: "#e3b341" }],
      }),
    );
  });

  out.push(
    ...nameBoard(
      ctx,
      ["Repositories", model.title, { text: note, tall: 0.34, fill: "#c9d1d9", weight: 700 }],
      {
        long,
        deep,
        front: Math.abs(front) + 0.15,
      },
    ),
  );
  return out;
};
