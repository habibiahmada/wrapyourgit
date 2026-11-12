import type { LayoutFamily, RecapData } from "@wyg/schema";
import { staticFile } from "remotion";
import { ARCHETYPE_INTRO, ARCHETYPE_NONE, archetypeModel } from "../../scenes/archetype.model";
import { LIT, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA_TOP, part, plaza, type Station, wrap } from "./kit";

/** Frames in an archetype's baked loop (art.ts LOOP_FRAMES), and ride frames each one is shown for. */
const LOOP = 30;
const HOLD = 2;

/**
 * The archetype's picture: a whole city block on one sheet, 4 by 3, the landing page's `skin-*`
 * loop played frame by frame (three/diorama/scenes.tsx Block). Cell stands on the plaza in its
 * middle, about three units tall here: `anchor` is the plaza under its feet, `reach` how high the
 * block's tallest tower or crane stands over that, and `spread` how far the island reaches to
 * each side of it on screen.
 */
const FIGURE = {
  wide: 18.8,
  tall: 14.1,
  anchor: [0.5, 0.67] as [number, number],
  reach: 9.8,
  spread: 8.3,
};
/** Cell thinking, alone, for a year with no archetype: the plain cut-out, Cell in its middle. */
const ALONE = {
  wide: 13.2,
  tall: 9.9,
  anchor: [0.5, 0.79] as [number, number],
  reach: 5.6,
  spread: 0,
};
/** The stage the block stands on: a pale deck, like a model on a table. The block is wider than it. */
const STAGE = { long: 9.6, deep: 5.6, tall: 0.45 };
const SPACE = { long: 11.4, deep: 7.2 };
/** The title board: its width, and how tall the intro and the title are. */
const TITLE = { wide: 11, intro: 0.85, name: 1.9, pad: 0.25, gap: 0.1 };
/**
 * Where the title board stands: behind the block on two tall posts, so that nothing stands in
 * front of the picture. `behind` is how far past the plaza's middle, `drop` how far under the
 * picture's top its foot is, and `along` how far it is moved along the rail. A narrow frame has
 * room over the roofs: the board stands right over them (`along` only centres it, because the
 * shot looks at the plaza from one side). A wide frame has room beside the towers and little
 * over them: there the board stands lower, off to one side of the block.
 */
const SIGN: Record<LayoutFamily, { behind: number; drop: number; along: number }> = {
  portrait: { behind: 4.6, drop: 0, along: 2.8 },
  compact: { behind: 4.6, drop: 0.6, along: 2.8 },
  landscape: { behind: 4.6, drop: 6.4, along: 15.5 },
};
const GOLD = "#ffd866";
/**
 * The pictures this station draws for `data`, as files under the public folder: every frame of
 * the archetype's loop, or Cell thinking when no style could be named. The canvas loads its
 * pictures before it draws (RideStory) and asks here, so the two can't name different files.
 */
export function archetypeFigures(data: RecapData): string[] {
  const model = archetypeModel(data);
  if (!model) return ["art/cutout-cell-think.png"];
  return Array.from(
    { length: LOOP },
    (_, i) => `art/skin-${model.id}/${String(i).padStart(2, "0")}.webp`,
  );
}

const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The style of the year. The picture is the station: a city block with Cell in the archetype's
 * costume in its middle, turned to the camera and moving, the district of its rule round it and
 * the things of its rule floating round Cell: the same loop the landing page shows, standing on
 * a pale stage like a model on a table. Nothing stands in front of it: its name is on a board
 * behind it, over the roofs in a narrow frame and beside the towers in a wide one, the model's
 * intro above the title in gold, with bulbs that chase on a 60-frame loop. The reasons behind the archetype are not printed here: the maintainer wanted the
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

  // The title board, always there like a station's sign, over the block from behind it.
  const lines = model
    ? [
        { text: ARCHETYPE_INTRO, tall: TITLE.intro, fill: "#c9d1d9", weight: 700 },
        { text: model.title, tall: TITLE.name, fill: GOLD, weight: 800 },
      ]
    : wrap(ARCHETYPE_NONE, 24).map((text) => ({ text, tall: 1.3, fill: "#ffffff", weight: 800 }));
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
  const sheet = model ? FIGURE : ALONE;
  // Cell alone is narrow: its board stands over its head in every frame.
  const sign = model ? SIGN[ctx.layout] : SIGN.portrait;
  const lift = PLAZA_TOP + STAGE.tall + sheet.reach - sign.drop;
  const far = -stop.side * sign.behind;
  const along = stop.side * sign.along;
  for (const post of [-TITLE.wide * 0.36, TITLE.wide * 0.36]) {
    out.push(
      part(c, yaw, along + post, far, 0, [0.2, 0.2, lift], TONE.dark, {
        tag: "board-post",
        edge: false,
      }),
    );
  }
  out.push(
    part(c, yaw, along, far, lift, [TITLE.wide, 0.18, tall], TONE.ink, {
      // A sign like any station's: there from the first frame, and kept in the camera's frame.
      tag: "board",
      lit: true,
      texts,
      decals: bulbs,
    }),
  );

  // The figure rises onto the stage as the train pulls in. Its loop plays on the idle clock, two
  // ride frames to each of its thirty, so it repeats every 60 frames like everything at rest.
  const up = easeOut(build / 0.7);
  if (up <= 0) return out;
  const files = archetypeFigures(data);
  const beat = Math.floor((((frame % 60) + 60) % 60) / HOLD) % files.length;
  out.push({
    kind: "picture",
    c: [c[0], c[1], PLAZA_TOP + STAGE.tall],
    href: staticFile(files[beat] ?? files[0] ?? ""),
    wide: sheet.wide * up,
    tall: sheet.tall * up,
    anchor: sheet.anchor,
    reach: sheet.reach * up,
    spread: sheet.spread * up,
  });
  return out;
};
