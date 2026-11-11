import { formatCount } from "../../../theme";
import { busiestModel } from "../../scenes/busiest.model";
import { LIT, TONE, toneOf } from "../palette";
import type { Solid } from "../prims";
import { PLAZA } from "../track";
import { nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

const BASE = { long: 5, deep: 2.6, tall: 2.1 };
/** The tower's sections from the base up: how wide each is, and its paint. */
const SECTIONS = [
  { wide: 1.9, tone: toneOf("#d2f5da") },
  { wide: 1.6, tone: toneOf("#2ea043") },
  { wide: 1.3, tone: toneOf("#d2f5da") },
];
const SECTION_TALL = 1.2;
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The busiest day: a lighthouse. Its stone base carries the day's count; the tower goes up on it
 * section by section as the train comes in, and when the lamp room is on, its beam turns once
 * every 60 frames. The sign carries which day it was. A year with no busiest day has no such
 * stop; without one this draws the bare plaza.
 */
export const busiest: Station = (ctx) => {
  const { data, c, yaw, build, frame, away } = ctx;
  const model = busiestModel(data);
  const out: Solid[] = plaza(ctx);
  if (!model) return out;
  out.push(
    ...nameBoard(ctx, [model.headline, `${model.weekday}, ${model.date}`], {
      deep: PLAZA.deep,
      fit: true,
      scale: 1.3,
    }),
  );
  const down = easeOut(build / 0.3);
  if (down <= 0) return out;

  // Before the tower is whole the figure rises (never below 1); at rest it is the day's exact count.
  const rising = Math.max(1, Math.round(model.count * Math.min(1, build) * 0.9));
  const shown = build >= 1 ? model.count : Math.min(rising, Math.max(1, model.count - 1));
  let z = PLAZA_TOP + (1 - down) * 5;
  out.push(
    part(c, yaw, 0, 0, z, [BASE.long, BASE.deep, BASE.tall], TONE.dark, {
      tag: "lighthouse-base",
      lit: true,
      decals: [
        { on: "all", rect: [0, 0, 1, 0.07], fill: "#21262d" },
        { on: "all", rect: [0, 0.93, 1, 1], fill: LIT },
      ],
      texts: [
        { on: "sides", rect: [0.05, 0.4, 0.95, 0.92], text: formatCount(shown), fill: "#ffffff" },
        {
          on: "sides",
          rect: [0.05, 0.08, 0.95, 0.37],
          // The noun follows the figure shown, so a rising count never reads "1 contributions".
          text: shown === 1 ? "contribution" : "contributions",
          fill: "#c9d1d9",
          weight: 700,
        },
      ],
    }),
  );
  z = PLAZA_TOP + BASE.tall;
  // Each piece is lowered on after the one under it; the lamp room last.
  const piece = (k: number, wide: number, tall: number, tone = TONE.dark, lit = false) => {
    const on = easeOut((build - 0.25 - k * 0.13) / 0.2);
    if (on > 0)
      out.push(
        part(c, yaw, 0, 0, z + (1 - on) * 5, [wide, wide, tall], tone, { tag: "lighthouse", lit }),
      );
    z += tall;
    return on;
  };
  SECTIONS.forEach((section, k) => {
    piece(k, section.wide, SECTION_TALL, section.tone, true);
  });
  piece(3, 1.9, 0.15);
  const lampZ = z;
  const lamp = piece(4, 0.9, 0.75, TONE.lamp, true);
  piece(4, 1.15, 0.25);
  // The beam: one turn every 60 frames, so a rest loop ends where it began. It is two arms that
  // start outside the lamp room, not one bar through it: faces are painted in order of their
  // middles, and a bar's middle is the lamp's own, so it was painted over the roof or under it
  // at the wrong moments.
  // The arms draw in as the train leaves: the next station's camera stands close by, and a
  // beam at this height would sweep through the foot of its picture.
  const reach = 3.2 * Math.max(0, Math.min(1, 1 - (away - 1) / 5));
  if (lamp >= 1 && reach > 0.05) {
    const turn = (((frame % 60) + 60) % 60) / 60;
    for (const arm of [-1, 1]) {
      out.push(
        part(
          c,
          yaw + turn * Math.PI * 2,
          arm * (0.5 + reach / 2),
          0,
          lampZ + 0.3,
          [reach, 0.2, 0.14],
          TONE.lamp,
          {
            tag: "beam",
            lit: true,
            edge: false,
          },
        ),
      );
    }
  }
  return out;
};
