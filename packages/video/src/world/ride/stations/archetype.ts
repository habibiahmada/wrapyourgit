import { ARCHETYPE_NONE, archetypeModel } from "../../scenes/archetype.model";
import { LIT, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA_TOP, part, plaza, type Station, wrap } from "./kit";

const STAGE = { long: 8.8, deep: 3, tall: 0.6 };
/** The marquee: how wide it is, and how tall its intro, its title and each row of a reason are. */
const MARQUEE = { wide: 8.6, intro: 0.55, title: 1.5, row: 0.5, pad: 0.34, lift: 1.0 };
const GOLD = toneOf("#e3b341");
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The style of the year: a stage with a marquee over it. The marquee carries the model's intro,
 * the archetype's title, and the reasons under it, a long one on two rows; its bulbs chase on a
 * 60-frame loop. A trophy stands in the spotlight. When no style's minimum was met the marquee
 * says so in the model's words and the stage stands empty: no label is forced.
 */
export const archetype: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  const model = archetypeModel(data);
  const out: Solid[] = plaza(ctx);
  const far = -stop.side * 0.9;
  const near = stop.side * 0.5;
  // The stage, with the spotlight's pool on its boards.
  out.push(
    part(c, yaw, 0, 0, PLAZA_TOP, [STAGE.long, STAGE.deep, STAGE.tall], TONE.wood, {
      tag: "stage",
      under: 1,
      decals: [
        { on: "all", rect: [0, 0.8, 1, 1], fill: LIT },
        ...(model
          ? [
              {
                on: "top",
                rect: [0.36, 0.14, 0.64, 0.86],
                fill: "#d8b98a",
                round: true,
              } satisfies Decal,
            ]
          : []),
      ],
    }),
  );
  const landed = easeOut(build / 0.45);
  if (landed <= 0) return out;
  const drop = (1 - landed) * 6;

  const max = Math.floor((MARQUEE.wide * 0.92) / (0.6 * MARQUEE.row * 0.92));
  const reasons = model ? model.reasons.flatMap((reason) => wrap(reason, max)) : [];
  const lines = model
    ? [
        { text: model.intro, tall: MARQUEE.intro, fill: "#c9d1d9", weight: 700 },
        { text: model.title, tall: MARQUEE.title, fill: "#ffffff", weight: 800 },
        ...reasons.map((text) => ({ text, tall: MARQUEE.row, fill: "#7ee08f", weight: 700 })),
      ]
    : wrap(ARCHETYPE_NONE, 22).map((text) => ({ text, tall: 0.8, fill: "#ffffff", weight: 800 }));
  const tall = MARQUEE.pad * 2 + lines.reduce((sum, line) => sum + line.tall, 0);
  let y = MARQUEE.pad;
  const texts: FaceText[] = lines.map((line) => {
    const rect: [number, number, number, number] = [
      0.04,
      1 - (y + line.tall) / tall,
      0.96,
      1 - y / tall,
    ];
    y += line.tall;
    return { on: "sides", rect, text: line.text, fill: line.fill, weight: line.weight };
  });
  // Bulbs along the top and the foot; every other one is lit, and they swap four times a loop.
  const phase = Math.floor((((frame % 60) + 60) % 60) / 15) % 2;
  const edge = MARQUEE.pad / tall;
  const bulbs: Decal[] = Array.from({ length: 16 }, (_, k) => k).flatMap((k) =>
    [1 - edge * 0.5, edge * 0.5].map(
      (v): Decal => ({
        on: "sides",
        rect: [(k + 0.5) / 16 - 0.012, v - edge * 0.22, (k + 0.5) / 16 + 0.012, v + edge * 0.22],
        fill: model && k % 2 === phase ? "#ffd866" : "#545d68",
        round: true,
      }),
    ),
  );
  const foot = PLAZA_TOP + STAGE.tall;
  for (const post of [-3.6, 3.6]) {
    out.push(
      part(c, yaw, post, far, foot + drop, [0.18, 0.18, MARQUEE.lift], TONE.dark, {
        tag: "board-post",
        edge: false,
      }),
    );
  }
  out.push(
    part(c, yaw, 0, far, foot + MARQUEE.lift + drop, [MARQUEE.wide, 0.18, tall], TONE.ink, {
      tag: "marquee",
      lit: true,
      texts,
      decals: bulbs,
    }),
  );
  if (!model) return out;

  // The trophy, lowered into the spotlight once the marquee is up.
  const cup = easeOut((build - 0.45) / 0.45);
  if (cup <= 0) return out;
  const z = foot + (1 - cup) * 5;
  out.push(part(c, yaw, 0, near, z, [0.9, 0.9, 0.22], TONE.dark, { tag: "trophy" }));
  out.push(part(c, yaw, 0, near, z + 0.22, [0.26, 0.26, 0.4], GOLD, { tag: "trophy", lit: true }));
  out.push(
    part(c, yaw, 0, near, z + 0.62, [0.95, 0.62, 0.62], GOLD, {
      tag: "trophy",
      lit: true,
      decals: [{ on: "all", rect: [0, 0.8, 1, 1], fill: "#f5d47a" }],
    }),
  );
  for (const handle of [-0.6, 0.6]) {
    out.push(
      part(c, yaw, handle, near, z + 0.86, [0.16, 0.2, 0.26], GOLD, { tag: "trophy", lit: true }),
    );
  }
  return out;
};
