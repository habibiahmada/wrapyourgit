import { LIT, TONE, toneOf } from "../palette";
import type { Decal, Solid } from "../prims";
import { PLAZA } from "../track";
import { NEAR_ENOUGH, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

/** What the sign says. The letter's own words are on its sheet (RideStory), not on a block. */
export const LETTER_TITLE = "A letter from Cell";

const PAPER = toneOf("#e6edf3");
const RED = toneOf("#da3633");
/** The envelope that stands behind the desk: how wide, how thick and how tall. */
const ENVELOPE = { wide: 3.4, thick: 0.18, tall: 2.2, lift: 0.5 };
const DESK = { at: -2.2, wide: 2.6, deep: 1.3, tall: 0.85 };
const BOX = { at: 2.6, side: 0.9, tall: 1.8 };

/**
 * The letter: where it is written and where it is posted. A writing desk with a sheet, a pen,
 * a sealed envelope and a lamp; a pillar box; and behind them an envelope as tall as a door, its
 * flap's two edges meeting at a green seal. They are what the train pulls up to. The letter
 * itself opens over the scene as a sheet of paper, a page to a stop (model.ts `letterView`): a
 * letter cannot be read printed on a block. Every page's stop stands here, so this is drawn
 * once, for the first.
 */
export const letter: Station = (ctx) => {
  const { c, yaw, build, stop } = ctx;
  const out: Solid[] = plaza(ctx);
  out.push(...nameBoard(ctx, [LETTER_TITLE], { deep: PLAZA.deep, fit: true }));
  if (build <= 0) return out;
  const fine = ctx.overview < NEAR_ENOUGH;
  const far = -stop.side * 1.5;
  const near = stop.side * 0.3;

  // The envelope: a V of steps for the flap on both faces, and the seal where they meet.
  const steps = 7;
  const flap: Decal[] = fine
    ? Array.from({ length: steps }, (_, k) => k).flatMap((k): Decal[] => {
        const v1 = 1 - (k * 0.5) / steps;
        const v0 = v1 - 0.5 / steps - 0.01;
        const u = (k * 0.5) / steps;
        const w = 0.5 / steps + 0.01;
        return [
          { on: "sides", rect: [u, v0, u + w, v1], fill: "#8b949e" },
          { on: "sides", rect: [1 - u - w, v0, 1 - u, v1], fill: "#8b949e" },
        ];
      })
    : [];
  out.push(
    part(c, yaw, 0, far, PLAZA_TOP, [ENVELOPE.wide + 0.4, 0.7, ENVELOPE.lift], TONE.dark, {
      tag: "envelope-foot",
    }),
    part(
      c,
      yaw,
      0,
      far,
      PLAZA_TOP + ENVELOPE.lift,
      [ENVELOPE.wide, ENVELOPE.thick, ENVELOPE.tall],
      PAPER,
      {
        tag: "envelope",
        lit: true,
        decals: [
          ...flap,
          {
            on: "sides",
            rect: [0.44, 0.4, 0.56, 0.4 + (0.12 * ENVELOPE.wide) / ENVELOPE.tall],
            fill: LIT,
            round: true,
          },
        ],
      },
    ),
  );

  // The desk: its top on two ends, a sheet with its lines, a pen, an envelope and a lamp.
  const top = PLAZA_TOP + DESK.tall;
  for (const end of [-1, 1]) {
    out.push(
      part(
        c,
        yaw,
        DESK.at + end * (DESK.wide / 2 - 0.12),
        near,
        PLAZA_TOP,
        [0.14, DESK.deep - 0.2, DESK.tall - 0.12],
        TONE.dark,
        {
          tag: "desk-leg",
        },
      ),
    );
  }
  out.push(
    part(c, yaw, DESK.at, near, top - 0.12, [DESK.wide, DESK.deep, 0.12], TONE.wood, {
      tag: "desk",
    }),
    part(c, yaw, DESK.at - 0.55, near, top, [0.8, 0.95, 0.03], PAPER, {
      tag: "desk-thing",
      lit: true,
      edge: false,
      decals: fine
        ? [0.16, 0.3, 0.44, 0.58, 0.72].map(
            (v, k): Decal => ({
              on: "top",
              rect: [0.12, v, k === 4 ? 0.6 : 0.88, v + 0.05],
              fill: k === 0 ? "#2ea043" : "#8b949e",
            }),
          )
        : [],
    }),
    part(c, yaw, DESK.at + 0.05, near - stop.side * 0.3, top, [0.5, 0.06, 0.06], TONE.ink, {
      tag: "desk-thing",
      edge: false,
    }),
    part(c, yaw, DESK.at + 0.55, near + stop.side * 0.15, top, [0.62, 0.44, 0.05], PAPER, {
      tag: "desk-thing",
      lit: true,
      decals: fine ? [{ on: "top", rect: [0.4, 0.36, 0.6, 0.64], fill: LIT, round: true }] : [],
    }),
    part(c, yaw, DESK.at + 1.05, near - stop.side * 0.4, top, [0.08, 0.08, 0.55], TONE.mid, {
      tag: "desk-thing",
      edge: false,
    }),
    part(c, yaw, DESK.at + 0.9, near - stop.side * 0.4, top + 0.55, [0.4, 0.2, 0.12], TONE.lamp, {
      tag: "desk-thing",
      lit: true,
    }),
    // A stool, pushed back from the desk toward the rail.
    part(c, yaw, DESK.at, near + stop.side * 1.05, PLAZA_TOP, [0.55, 0.55, 0.5], TONE.dark, {
      tag: "stool",
    }),
  );

  // The pillar box: a foot, the red body with its slot and its plate, a cap.
  out.push(
    part(c, yaw, BOX.at, near, PLAZA_TOP, [BOX.side + 0.12, BOX.side + 0.12, 0.14], TONE.dark, {
      tag: "post-box",
    }),
    part(c, yaw, BOX.at, near, PLAZA_TOP + 0.14, [BOX.side, BOX.side, BOX.tall], RED, {
      tag: "post-box",
      lit: true,
      decals: fine
        ? [
            { on: "all", rect: [0.18, 0.72, 0.82, 0.79], fill: "#0d1117" },
            { on: "all", rect: [0.28, 0.4, 0.72, 0.58], fill: "#f0f6fc" },
            { on: "all", rect: [0, 0, 1, 0.06], fill: "#8e1519" },
          ]
        : [],
    }),
    part(
      c,
      yaw,
      BOX.at,
      near,
      PLAZA_TOP + 0.14 + BOX.tall,
      [BOX.side + 0.14, BOX.side + 0.14, 0.2],
      toneOf("#b62324"),
      {
        tag: "post-box",
        lit: true,
      },
    ),
  );
  return out;
};
