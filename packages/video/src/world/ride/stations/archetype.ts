import type { RecapData } from "@wyg/schema";
import { staticFile } from "remotion";
import { ARCHETYPE_INTRO, ARCHETYPE_NONE, archetypeModel } from "../../scenes/archetype.model";
import { LIT, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA_TOP, part, plaza, type Station, wrap } from "./kit";

/**
 * The cut-out: Cell in the archetype's costume, the landing page's picture (4 by 3, Cell in its
 * middle). `tall` is the whole picture's height; Cell itself stands a little over half of it, so
 * it is about five and a half units tall, the largest figure on the ride. `anchor` is its feet.
 */
const FIGURE = { wide: 13.2, tall: 9.9, anchor: [0.5, 0.79] as [number, number] };
/** How tall Cell stands in that picture, for the camera to frame it. */
const FIGURE_HEIGHT = 5.6;
/** The stage: a pale deck, so the figure stands out from the dark plaza. */
const STAGE = { long: 7.6, deep: 5.6, tall: 0.45 };
const SPACE = { long: 10.4, deep: 7.2 };
/** The title board at the foot of the stage: its width, and how tall the intro and the title are. */
const TITLE = { wide: 7.6, intro: 0.56, name: 1.3, pad: 0.24, gap: 0.08 };
const GOLD = "#ffd866";
/**
 * The picture this station shows for `data`, as a file under the public folder: the archetype's
 * cut-out, or Cell thinking when no style could be named. The canvas loads its pictures before
 * it draws (RideStory), and asks here, so the two can't name different files.
 */
export function archetypeFigure(data: RecapData): string {
  const model = archetypeModel(data);
  return model ? `art/cutout-${model.id}.png` : "art/cutout-cell-think.png";
}

const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The style of the year. The picture is the station: Cell in the archetype's costume (a hard hat
 * and a hammer, a headset, a sweatband, and so on), the same cut-out the landing page shows,
 * standing large on a pale, spotlit stage. Nothing stands over it. Its name is on a low board at
 * the foot of the stage, the model's intro above the title in gold, with bulbs that chase on a
 * 60-frame loop. The reasons behind the archetype are not printed here: the maintainer wanted the
 * picture alone to carry this stop. When no style's minimum was met the board says so in the
 * model's words and Cell stands there thinking: no label is forced.
 */
export const archetype: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  const model = archetypeModel(data);
  const out: Solid[] = plaza(ctx, SPACE.long, SPACE.deep);
  // The stage is part of the plaza: a pale deck with a lit rim and a spotlight's pool on it.
  out.push(
    part(c, yaw, 0, 0, PLAZA_TOP, [STAGE.long, STAGE.deep, STAGE.tall], toneOf("#aab4bf"), {
      tag: "stage",
      under: 2,
      decals: [
        { on: "all", rect: [0, 0.72, 1, 1], fill: LIT },
        {
          on: "top",
          rect: [0.14, 0.12, 0.86, 0.88],
          fill: model ? "#ffe9a3" : "#c9d1d9",
          round: true,
        },
      ],
    }),
  );

  // The title board, always there like a station's sign, toward the rail from the stage.
  const lines = model
    ? [
        { text: ARCHETYPE_INTRO, tall: TITLE.intro, fill: "#c9d1d9", weight: 700 },
        { text: model.title, tall: TITLE.name, fill: GOLD, weight: 800 },
      ]
    : wrap(ARCHETYPE_NONE, 24).map((text) => ({ text, tall: 0.8, fill: "#ffffff", weight: 800 }));
  const tall =
    TITLE.pad * 2 +
    lines.reduce((sum, line) => sum + line.tall, 0) +
    TITLE.gap * (lines.length - 1);
  let y = TITLE.pad;
  const texts: FaceText[] = lines.map((line) => {
    const rect: [number, number, number, number] = [
      0.04,
      1 - (y + line.tall) / tall,
      0.96,
      1 - y / tall,
    ];
    y += line.tall + TITLE.gap;
    return { on: "sides", rect, text: line.text, fill: line.fill, weight: line.weight };
  });
  // Bulbs along the top and the foot; every other one is lit, and they swap four times a loop.
  const phase = Math.floor((((frame % 60) + 60) % 60) / 15) % 2;
  const edge = TITLE.pad / tall;
  const bulbs: Decal[] = Array.from({ length: 16 }, (_, k) => k).flatMap((k) =>
    [1 - edge * 0.5, edge * 0.5].map(
      (v): Decal => ({
        on: "sides",
        rect: [(k + 0.5) / 16 - 0.012, v - edge * 0.26, (k + 0.5) / 16 + 0.012, v + edge * 0.26],
        fill: model && k % 2 === phase ? GOLD : "#545d68",
        round: true,
      }),
    ),
  );
  const near = stop.side * (SPACE.deep / 2 + 2.6);
  for (const post of [-TITLE.wide * 0.36, TITLE.wide * 0.36]) {
    out.push(
      part(c, yaw, post, near, 0, [0.16, 0.16, 0.2], TONE.dark, { tag: "board-post", edge: false }),
    );
  }
  out.push(
    part(c, yaw, 0, near, 0.2, [TITLE.wide, 0.18, tall], TONE.ink, {
      // A sign like any station's: there from the first frame, and kept in the camera's frame.
      tag: "board",
      lit: true,
      texts,
      decals: bulbs,
    }),
  );

  // The figure steps onto the stage as the train pulls in, and keeps a small bounce at rest.
  const up = easeOut(build / 0.7);
  if (up <= 0) return out;
  const floor = PLAZA_TOP + STAGE.tall;
  // Folded to the loop first, so a rest loop repeats to the last bit.
  const beat = (((frame % 60) + 60) % 60) / 30;
  const hop = build >= 1 ? Math.abs(Math.sin(beat * Math.PI)) * 0.12 : 0;
  out.push({
    kind: "picture",
    c: [c[0], c[1], floor + hop],
    href: staticFile(archetypeFigure(data)),
    wide: FIGURE.wide * up,
    tall: FIGURE.tall * up,
    anchor: FIGURE.anchor,
    reach: FIGURE_HEIGHT * up,
  });
  return out;
};
