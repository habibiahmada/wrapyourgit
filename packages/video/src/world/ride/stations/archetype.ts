import { staticFile } from "remotion";
import { ARCHETYPE_NONE, archetypeModel } from "../../scenes/archetype.model";
import { TONE } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA_TOP, part, plaza, type Station, wrap } from "./kit";

/** The diorama: the landing page's picture of this archetype, 4 by 3, standing on the plaza. */
const ROOM = { wide: 7.2, tall: 5.4, anchor: [0.5, 0.62] as [number, number] };
/** The marquee: how wide it is, how tall its intro, its title and each row of a reason are, and how high it hangs over the room. */
const MARQUEE = { wide: 8.6, intro: 0.56, title: 1.35, row: 0.62, pad: 0.3, lift: 3.6 };
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The style of the year: the same diorama the landing page shows for the archetype (Cell in a
 * hard hat in a workshop, Cell running laps, and so on), standing on the plaza like a cut-out,
 * under a marquee. The marquee carries the model's intro, the archetype's title, and the reasons
 * under it, a long one on two rows; its bulbs chase on a 60-frame loop. When no style's minimum
 * was met the marquee says so in the model's words and no room is shown: no label is forced.
 */
export const archetype: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  const model = archetypeModel(data);
  const out: Solid[] = plaza(ctx);
  const far = -stop.side * 1.2;
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
  const foot = PLAZA_TOP;
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

  // The room is lowered onto the plaza once the marquee is up.
  const down = easeOut((build - 0.4) / 0.5);
  if (down <= 0) return out;
  out.push({
    kind: "picture",
    c: [c[0], c[1], PLAZA_TOP + (1 - down) * 6],
    href: staticFile(`art/skin-${model.id}.png`),
    wide: ROOM.wide,
    tall: ROOM.tall,
    anchor: ROOM.anchor,
  });
  return out;
};
