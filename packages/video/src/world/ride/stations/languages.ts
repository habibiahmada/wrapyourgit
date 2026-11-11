import { staticFile } from "remotion";
import { languageIcon, languageInitials } from "../../../languages";
import { gardenModel } from "../../scenes/garden.model";
import { inkOn, LIT, mixHex, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { board, clip, PLAZA_TOP, part, plaza, type Station } from "./kit";

const PLINTH = 0.22;
const GAP = 0.3;
const FULL_WIDTH = 2.2;
/** Where each rank stands, from the middle outward: the tallest in the middle. */
const SLOTS = [0, -1, 1, -2, 2];
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * A podium of the top languages: one block per language, as tall as its share, wearing its logo,
 * its share and its name on every side. Blocks drop in, lowest rank first, and have all landed
 * when the train stops.
 */
export const languages: Station = (ctx) => {
  const { data, c, yaw, build } = ctx;
  const model = gardenModel(data);
  const out: Solid[] = plaza(ctx);
  const base = PLAZA_TOP + PLINTH;

  if (model.empty) {
    // Nothing to show is not zero: the plinths stand covered, and the board says why.
    for (const slot of [-1, 0, 1]) {
      out.push(
        part(c, yaw, slot * 2.6, 0, PLAZA_TOP, [2.5, 2.5, PLINTH], TONE.dark, { tag: "plinth" }),
      );
      out.push(part(c, yaw, slot * 2.6, 0, base, [1.9, 1.9, 1.1], TONE.mid, { tag: "covered" }));
    }
    out.push(
      ...board(c, yaw, 5.6, 0, 4.4, [
        model.title,
        { text: model.caption, tall: 0.34, fill: "#c9d1d9", weight: 700 },
      ]),
    );
    return out;
  }

  const n = model.trees.length;
  const wide = Math.min(FULL_WIDTH, (PLAZA.long - 0.6 - (n - 1) * GAP) / n);
  const k = wide / FULL_WIDTH;
  // The used slots, shifted so the group sits in the middle of the plaza whatever its size.
  const used = SLOTS.slice(0, n);
  const centre = (Math.min(...used) + Math.max(...used)) / 2;

  model.trees.forEach((tree, rank) => {
    const dx = ((SLOTS[rank] ?? 0) - centre) * (wide + GAP);
    out.push(
      part(c, yaw, dx, 0, PLAZA_TOP, [wide + 0.3, wide + 0.3, PLINTH], TONE.dark, {
        tag: "plinth",
      }),
    );
    // Lowest rank first; the winner lands last, just before the stop.
    const delay = n === 1 ? 0 : 0.45 * ((n - 1 - rank) / (n - 1));
    const landed = (build - delay) / 0.55;
    if (landed <= 0) return;
    const tall = 3.0 + tree.share * 4.6;
    const tone = toneOf(tree.color);
    const ink = inkOn(tree.color);
    const icon = languageIcon(tree.name);
    // Down each side: the logo (or a badge with initials), the share in large type, the name.
    const texts: FaceText[] = [
      {
        on: "all",
        rect: [0.08, 1 - (2.42 * k) / tall, 0.92, 1 - (1.72 * k) / tall],
        text: tree.label,
        fill: ink,
      },
      {
        on: "all",
        rect: [0.06, 1 - (2.82 * k) / tall, 0.94, 1 - (2.48 * k) / tall],
        text: clip(tree.name, 12),
        fill: ink,
        weight: 700,
      },
    ];
    const decals: Decal[] = [
      { on: "all", rect: [0, 0, 1, 0.06], fill: tone.right },
      { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: mixHex(tree.color, "#ffffff", 0.3) },
    ];
    if (!icon) {
      const badge: [number, number, number, number] = [
        0.2,
        1 - (1.5 * k) / tall,
        0.8,
        1 - (0.2 * k) / tall,
      ];
      decals.push({ on: "all", rect: badge, fill: "#161b22" });
      texts.push({
        on: "all",
        rect: [0.26, badge[1] + 0.02, 0.74, badge[3] - 0.02],
        text: languageInitials(tree.name),
        fill: "#ffffff",
      });
    }
    out.push(
      part(c, yaw, dx, 0, base + (1 - easeOut(landed)) * 6, [wide, wide, tall], tone, {
        tag: "language",
        lit: true,
        logo: icon ? staticFile(icon) : undefined,
        texts,
        decals,
      }),
    );
  });

  // Confetti from the winner as it lands; gone by the time the train has stopped.
  const first = model.trees[0];
  const burst = (build - 0.82) / 0.18;
  if (first && burst > 0 && burst < 1) {
    const top = base + 3.0 + first.share * 4.6;
    const dx = ((SLOTS[0] ?? 0) - centre) * (wide + GAP);
    const colours = [first.color, LIT, "#e3b341"];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 * 3.1;
      const reach = (0.4 + ((i * 7) % 10) / 10) * 2.2 * burst;
      const z = top + (2 + ((i * 3) % 7) / 3) * burst - 4.5 * burst * burst;
      out.push({
        kind: "ball",
        c: [
          c[0] + dx * Math.cos(yaw) + Math.cos(a) * reach,
          c[1] + dx * Math.sin(yaw) + Math.sin(a) * reach,
          z,
        ],
        r: 0.09,
        color: colours[i % 3] ?? LIT,
        opacity: 1 - burst,
      });
    }
  }

  out.push(
    ...board(c, yaw, 5.6, 0, 4.4, [
      "Top languages",
      model.title,
      { text: model.otherNote ?? "", tall: 0.36, fill: "#c9d1d9", weight: 700 },
    ]),
  );
  return out;
};
