import { formatCount } from "../../../theme";
import { commitsText, projectsModel } from "../../scenes/projects.model";
import { TONE } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { board, clip, PLAZA_TOP, part, plaza, type Station } from "./kit";

const BASE = 0.14;
const CRATE = { side: 1.25, tall: 0.95 };
const SPACING = 2.6;
const FRAME: Decal[] = [
  { on: "all", rect: [0, 0, 1, 0.12], fill: "#6f5238" },
  { on: "all", rect: [0, 0.88, 1, 1], fill: "#6f5238" },
  { on: "all", rect: [0, 0, 0.1, 1], fill: "#6f5238" },
  { on: "all", rect: [0.9, 0, 1, 1], fill: "#6f5238" },
  { on: "all", rect: [0.1, 0.47, 0.9, 0.53], fill: "#7d5d40" },
  { on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: "#b08a61" },
];
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * One tower of crates per repository, with a plaque in front of it carrying the repository and
 * its commits. Crates drop one after another; the count on the plaque rises with them and is
 * exact when the train stops.
 */
export const projects: Station = (ctx) => {
  const { data, c, yaw, build, stop } = ctx;
  const model = projectsModel(data);
  const out: Solid[] = plaza(ctx);
  const floor = PLAZA_TOP + BASE;
  const note = [model.subtitle, model.legend].filter(Boolean).join(" · ");

  if (model.empty) {
    // An empty shelf is not zero commits to show: the bases stand shuttered, and the board says so.
    for (const slot of [-1, 0, 1]) {
      out.push(
        part(c, yaw, slot * SPACING, 0, PLAZA_TOP, [1.7, 1.7, 0.9], TONE.dark, {
          tag: "shuttered",
          decals: [0.2, 0.4, 0.6, 0.8].map((v) => ({
            on: "all" as const,
            rect: [0.1, v - 0.03, 0.9, v + 0.03] as [number, number, number, number],
            fill: "#545d68",
          })),
        }),
      );
    }
    out.push(...board(c, yaw, 5.6, 0, 4.4, ["Repositories", model.title]));
    return out;
  }

  const n = model.stacks.length;
  model.stacks.forEach((stack, i) => {
    const dx = (i - (n - 1) / 2) * SPACING;
    out.push(part(c, yaw, dx, 0, PLAZA_TOP, [1.7, 1.7, BASE], TONE.dark, { tag: "base" }));
    const start = n === 1 ? 0 : 0.25 * (i / (n - 1));
    for (let k = 0; k < stack.crates; k++) {
      const delay = start + (stack.crates === 1 ? 0 : 0.45 * (k / (stack.crates - 1)));
      const landed = (build - delay) / 0.3;
      if (landed <= 0) continue;
      out.push(
        part(
          c,
          yaw,
          dx,
          0,
          floor + k * CRATE.tall + (1 - easeOut(landed)) * 5,
          [CRATE.side, CRATE.side, CRATE.tall],
          TONE.wood,
          {
            tag: "crate",
            lit: true,
            decals: FRAME,
          },
        ),
      );
    }
    // The count rises with the crates and is the exact figure, in the model's words, at rest.
    const shown =
      build >= 1
        ? commitsText(stack.commits)
        : `${formatCount(Math.round(stack.commits * Math.max(0, build) * 0.9))} commits`;
    const texts: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => [
      {
        on,
        rect: [0.06, 0.56, 0.94, 0.92],
        text: clip(stack.label, 16),
        fill: "#c9d1d9",
        weight: 700,
      },
      { on, rect: [0.06, 0.08, 0.94, 0.54], text: shown, fill: "#ffffff" },
    ]);
    // In front of the tower, on the side toward the rail and the camera.
    const front = stop.side * 1.55;
    out.push(
      part(c, yaw, dx, front, PLAZA_TOP, [0.12, 0.12, 0.3], TONE.dark, {
        edge: false,
        tag: "plaque-post",
      }),
    );
    out.push(
      part(c, yaw, dx, front, PLAZA_TOP + 0.3, [2.3, 0.12, 0.95], TONE.ink, {
        tag: "plaque",
        lit: true,
        texts,
        decals: [{ on: "sides", rect: [0, 0, 1, 0.06], fill: "#e3b341" }],
      }),
    );
  });

  out.push(
    ...board(c, yaw, 5.6, 0, 4.4, [
      "Repositories",
      model.title,
      { text: note, tall: 0.34, fill: "#c9d1d9", weight: 700 },
    ]),
  );
  return out;
};
