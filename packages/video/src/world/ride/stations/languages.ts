import type { LayoutFamily } from "@wyg/schema";
import { staticFile } from "remotion";
import { languageIcon, languageInitials } from "../../../languages";
import { gardenModel } from "../../scenes/garden.model";
import { inkOn, LIT, mixHex, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { clip, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

const PLINTH = 0.22;
const GAP = 0.3;
/** A block is a slab: wide along the rail, where its words are printed large, and less deep. */
const DEEP = 1.7;
/** How wide a block is: enough for a ten-letter name at a size that reads. */
const WIDE = 3.0;
/** How many blocks stand in one row. */
const ROW = 3;
/** How high the back row's tier lifts it when there are two rows. */
const TIER = 1.3;
/** Where each rank stands, from the middle outward: the tallest in the middle. */
const SLOTS = [0, -1, 1, -2, 2];
/** Down a block's side, in world units from its top: the logo, the share, the name. */
const LOGO = 1.0;
const SHARE = { top: 1.3, bottom: 2.1 };
const NAME = { top: 2.16, bottom: 2.66 };
/** The shortest block: room for the logo, the share and the name. */
const LOWEST = 2.8;
/** How much taller a block with every commit would be. A frame with less height gets less. */
const RISE = { portrait: 4.6, landscape: 2.6, compact: 1.6 };
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/** How tall a language's block is: as tall as its share, on top of the room its words need. */
export const blockHeight = (share: number, layout: LayoutFamily) => LOWEST + share * RISE[layout];

/** A language's name as its block prints it. */
export const blockName = (name: string) => clip(name, 11);

/**
 * A podium of the top languages: one block per language, as tall as its share, wearing its logo,
 * its share and its name on every side. Blocks drop in, lowest rank first, and have all landed
 * when the train stops.
 */
export const languages: Station = (ctx) => {
  const { data, c, yaw, build } = ctx;
  const model = gardenModel(data);
  const base = PLAZA_TOP + PLINTH;

  if (model.empty) {
    // Nothing to show is not zero: the plinths stand covered, and the board says why.
    const out: Solid[] = plaza(ctx);
    for (const slot of [-1, 0, 1]) {
      out.push(
        part(c, yaw, slot * 2.6, 0, PLAZA_TOP, [2.5, 2.5, PLINTH], TONE.dark, { tag: "plinth" }),
      );
      out.push(part(c, yaw, slot * 2.6, 0, base, [1.9, 1.9, 1.1], TONE.mid, { tag: "covered" }));
    }
    out.push(
      ...nameBoard(
        ctx,
        [model.title, { text: model.caption, tall: 0.34, fill: "#c9d1d9", weight: 700 }],
        {
          long: PLAZA.long,
          deep: PLAZA.deep,
          front: 1.35,
        },
      ),
    );
    return out;
  }

  // A wide frame has room for every block in one row. In a narrow one, a row of four or five
  // would be too long for its words to stay readable, so the fourth and fifth stand in front and
  // the first three move up onto a tier behind them.
  const n = model.trees.length;
  const tiers = n > ROW && ctx.layout !== "landscape";
  const back = tiers ? ROW : n;
  const front = n - back;
  // A narrow frame paints the station's name on the floor in front of the blocks, which needs room.
  const deep = ctx.layout === "landscape" ? PLAZA.deep : tiers ? 6.8 : 5.8;
  const long = Math.max(PLAZA.long, back * WIDE + (back - 1) * GAP + 1.4);
  const out: Solid[] = plaza(ctx, long, deep);
  const side = ctx.stop.side;
  if (tiers) {
    out.push(
      part(
        c,
        yaw,
        0,
        -side * 1.3,
        PLAZA_TOP,
        [back * WIDE + (back - 1) * GAP + 0.6, DEEP + 0.6, TIER],
        TONE.dark,
        {
          tag: "tier",
          decals: [{ on: "all", rect: [0, 0.94, 1, 1], fill: "#26a641" }],
        },
      ),
    );
  }
  /** Where a rank stands: how far along the plaza, how far toward the rail, how high its plinth is. */
  const place = (rank: number) => {
    if (rank < back) {
      const used = SLOTS.slice(0, back);
      const centre = (Math.min(...used) + Math.max(...used)) / 2;
      return {
        dx: ((SLOTS[rank] ?? 0) - centre) * (WIDE + GAP),
        dy: tiers ? -side * 1.3 : 0,
        z: PLAZA_TOP + (tiers ? TIER : 0),
      };
    }
    return { dx: (rank - back - (front - 1) / 2) * (WIDE + GAP), dy: side * 1.5, z: PLAZA_TOP };
  };

  model.trees.forEach((tree, rank) => {
    const { dx, dy, z } = place(rank);
    out.push(
      part(c, yaw, dx, dy, z, [WIDE + 0.3, DEEP + 0.3, PLINTH], TONE.dark, { tag: "plinth" }),
    );
    // Lowest rank first; the winner lands last, just before the stop.
    const delay = n === 1 ? 0 : 0.45 * ((n - 1 - rank) / (n - 1));
    const landed = (build - delay) / 0.55;
    if (landed <= 0) return;
    const tall = blockHeight(tree.share, ctx.layout);
    const tone = toneOf(tree.color);
    const ink = inkOn(tree.color);
    const icon = languageIcon(tree.name);
    const row = (band: { top: number; bottom: number }): [number, number, number, number] => [
      0.04,
      1 - band.bottom / tall,
      0.96,
      1 - band.top / tall,
    ];
    const texts: FaceText[] = [
      { on: "all", rect: row(SHARE), text: tree.label, fill: ink },
      { on: "all", rect: row(NAME), text: blockName(tree.name), fill: ink, weight: 700 },
    ];
    const decals: Decal[] = [
      { on: "all", rect: [0, 0, 1, 0.06], fill: tone.right },
      { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: mixHex(tree.color, "#ffffff", 0.3) },
    ];
    if (!icon) {
      // No logo for this language: a dark badge with its initials stands in for one.
      const badge: [number, number, number, number] = [
        0.3,
        1 - (0.17 + LOGO) / tall,
        0.7,
        1 - 0.17 / tall,
      ];
      decals.push({ on: "all", rect: badge, fill: "#161b22" });
      texts.push({
        on: "all",
        rect: [badge[0] + 0.04, badge[1] + 0.03, badge[2] - 0.04, badge[3] - 0.03],
        text: languageInitials(tree.name),
        fill: "#ffffff",
      });
    }
    out.push(
      part(c, yaw, dx, dy, z + PLINTH + (1 - easeOut(landed)) * 6, [WIDE, DEEP, tall], tone, {
        tag: "language",
        lit: true,
        logo: icon ? staticFile(icon) : undefined,
        logoSide: LOGO,
        texts,
        decals,
      }),
    );
  });

  // Confetti from the winner as it lands; gone by the time the train has stopped.
  const first = model.trees[0];
  const burst = (build - 0.82) / 0.18;
  if (first && burst > 0 && burst < 1) {
    const spot = place(0);
    const top = spot.z + PLINTH + blockHeight(first.share, ctx.layout);
    const dx = spot.dx;
    const dy = spot.dy;
    const colours = [first.color, LIT, "#e3b341"];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 * 3.1;
      const reach = (0.4 + ((i * 7) % 10) / 10) * 2.2 * burst;
      out.push({
        kind: "ball",
        c: [
          c[0] + dx * Math.cos(yaw) - dy * Math.sin(yaw) + Math.cos(a) * reach,
          c[1] + dx * Math.sin(yaw) + dy * Math.cos(yaw) + Math.sin(a) * reach,
          top + (2 + ((i * 3) % 7) / 3) * burst - 4.5 * burst * burst,
        ],
        r: 0.09,
        color: colours[i % 3] ?? LIT,
        opacity: 1 - burst,
      });
    }
  }

  out.push(
    ...nameBoard(
      ctx,
      [
        "Top languages",
        model.title,
        { text: model.otherNote ?? "", tall: 0.36, fill: "#c9d1d9", weight: 700 },
      ],
      {
        long,
        deep,
        // The floor in front of the nearest row of blocks.
        front: (tiers ? 1.5 : 0) + (DEEP + 0.3) / 2 + 0.1,
      },
    ),
  );
  return out;
};
