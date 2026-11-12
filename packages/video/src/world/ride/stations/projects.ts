import { commitsText, projectsModel } from "../../scenes/projects.model";
import { TONE } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { clip, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

/** A container: how long and deep every one is, and how tall the first and the others are. */
const LONG = 8;
const DEEP = 2;
const FIRST = { tall: 1.9, name: [0.1, 0.62], figure: [0.68, 1.78] } as const;
const REST = { tall: 0.95 } as const;
/** Shipping-container paint, dark enough for white letters. */
const PAINT = ["#a8452f", "#2b6a99", "#2f7d6d", "#9a6a14", "#5d4a94"];
const RACK = { top: "#2d333b", left: "#22272e", right: "#1c2128" };
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * A stack of shipping containers, one per repository, the one with the most commits at the
 * bottom. Every level is a rack of the same length; the painted container on it is as long as the
 * repository's share of the largest one, so the lengths compare truly, from zero. The name and
 * the commits are painted across the side. Containers are lowered on one after another; the
 * figure rises as one lands and is exact when the train stops, and a level that has not landed
 * is not there, so nothing ever reads zero.
 */
export const projects: Station = (ctx) => {
  const { data, c, yaw, build } = ctx;
  const model = projectsModel(data);

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
    out.push(...nameBoard(ctx, [model.title], { deep: PLAZA.deep, fit: true }));
    return out;
  }

  const out: Solid[] = plaza(ctx);
  const n = model.stacks.length;
  const most = Math.max(...model.stacks.map((stack) => stack.commits));
  let z = PLAZA_TOP;
  model.stacks.forEach((stack, i) => {
    const rows = i === 0 ? FIRST : REST;
    const base = z;
    z += rows.tall;
    const landed = (build - (n === 1 ? 0 : 0.5 * (i / (n - 1)))) / 0.4;
    if (landed <= 0) return;
    const share = stack.commits / most;
    const paint = PAINT[i % PAINT.length] ?? "#2b6a99";
    // Before it has landed the figure rises (never below 1); at rest it is the model's exact words.
    const rising = Math.max(1, Math.round(stack.commits * Math.min(1, landed) * 0.9));
    const figure = commitsText(
      build >= 1 ? stack.commits : Math.min(rising, stack.commits - 1 || 1),
    );
    const row = ([top, bottom]: readonly [number, number]): [number, number] => [
      1 - bottom / rows.tall,
      1 - top / rows.tall,
    ];
    const texts: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => {
      const name = { on, text: clip(stack.label, 14), fill: "#ffffff", weight: 700 };
      const count = { on, text: figure, fill: "#ffffff" };
      if (i === 0) {
        const [n0, n1] = row(FIRST.name);
        const [f0, f1] = row(FIRST.figure);
        return [
          { ...name, rect: [0.03, n0, 0.97, n1] },
          { ...count, rect: [0.03, f0, 0.97, f1] },
        ];
      }
      // One row: the name on the left half, the commits on the right. A face's own left is the
      // left of whoever looks at it from outside, whichever side of the rail the plaza is on.
      return [
        { ...name, rect: [0.02, 0.12, 0.48, 0.88] },
        { ...count, rect: [0.52, 0.12, 0.98, 0.88] },
      ];
    });
    const decals: Decal[] = [
      { on: "sides", rect: [0, 0, share, 1], fill: paint },
      { on: "all", rect: [0, 0, 1, 0.07], fill: "#161b22" },
    ];
    out.push(
      part(c, yaw, 0, 0, base + (1 - easeOut(landed)) * 5, [LONG, DEEP, rows.tall], RACK, {
        tag: "container",
        lit: true,
        texts,
        decals,
      }),
    );
  });

  out.push(...nameBoard(ctx, [model.title], { deep: PLAZA.deep, fit: true }));
  return out;
};
