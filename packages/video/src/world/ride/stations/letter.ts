import { LIT, TONE, toneOf } from "../palette";
import type { Decal, Solid } from "../prims";
import type { RideCamera } from "../project";
import { PLAZA } from "../track";
import {
  NEAR_ENOUGH,
  nameBoard,
  PLAZA_TOP,
  part,
  plaza,
  type Station,
  type StationContext,
} from "./kit";

/** What the sign says. The letter's own words are on its sheet (RideStory), not on a block. */
export const LETTER_TITLE = "A letter from Cell";

const PAPER = toneOf("#e6edf3");
const RED = toneOf("#da3633");
/** The envelope that stands behind the desk: how wide, how thick and how tall. */
const ENVELOPE = { wide: 3.4, thick: 0.18, tall: 2.2, lift: 0.5 };
const DESK = { at: -2.2, wide: 2.6, deep: 1.3, tall: 0.85 };
const BOX = { at: 2.6, side: 0.9, tall: 1.8 };
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};
/**
 * The desk's shot: what it looks at (across the plaza, from its middle toward the rail), and how
 * far out and up from there the camera stands, times `BACK` for the frame's layout.
 */
const SHOT = { look: 0.45, out: 2.65, up: 3.0 };
const BACK = { landscape: 1, compact: 1.22, portrait: 1.75 };
/** How far up the camera's line of sight, from the desk to the camera, the letter comes. */
const LETTER_UP = 0.4;
/** How much wider and deeper the letter is unfolded than folded: a narrow frame's is taller. */
const UNFOLDED = {
  landscape: { wide: 1.25, deep: 1.7 },
  compact: { wide: 1.1, deep: 2.0 },
  portrait: { wide: 1.1, deep: 2.4 },
};
/** How far the envelope's flap lies back when it is open: it stays on the desk. */
const FLAP = 0.24;

/**
 * Where the camera stands to read at the desk: over the edge of the plaza toward the rail,
 * looking down on the envelope. `letterBeat` brings the station's shot in to this and back.
 */
export function deskShot(ctx: StationContext): RideCamera {
  const { c, yaw, stop } = ctx;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const place = (dx: number, dy: number, z: number): [number, number, number] => [
    c[0] + dx * cos - dy * sin,
    c[1] + dx * sin + dy * cos,
    c[2] + z,
  ];
  const top = PLAZA_TOP + DESK.tall;
  // A narrow frame sees less to either side, so it stands further back along the same line.
  const back = BACK[ctx.layout];
  return {
    pos: place(DESK.at + 0.35, stop.side * (SHOT.look + SHOT.out * back), top + SHOT.up * back),
    look: place(DESK.at + 0.35, stop.side * SHOT.look, top),
    fov: 34,
  };
}

/**
 * The letter: where it is written and where it is posted. A writing desk with a sheet, a pen,
 * a sealed envelope and a lamp; a pillar box; and behind them an envelope as tall as a door, its
 * flap's two edges meeting at a green seal. They are what the train pulls up to. The letter
 * itself comes up over the scene as a sheet of paper, a page to a stop: a letter cannot be read
 * printed on a block. Before that the story goes to the desk (model.ts `letterBeat`): the camera
 * comes in (`deskShot`), the envelope there opens by `letterOpen`, and the letter comes out of it. Every page's stop stands here, so this is drawn
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
    part(c, yaw, DESK.at - 0.85, near, top, [0.6, 0.85, 0.03], PAPER, {
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
    part(c, yaw, DESK.at - 0.3, near - stop.side * 0.35, top, [0.5, 0.06, 0.06], TONE.ink, {
      tag: "desk-thing",
      edge: false,
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

  // The envelope on the desk, the one the camera comes in to. Shut, its flap's two edges meet at
  // a seal, the fold on the side away from the rail (the top of it, from where the camera is).
  // As it opens the seal goes and the flap lies back; the letter comes out of its mouth, top
  // first; then it lifts off the desk and comes up to whoever is looking, unfolding as it does,
  // and is the sheet that then fills the frame.
  const open = ctx.letterOpen ?? 0;
  const mail = { at: DESK.at + 0.35, wide: 1.25, deep: 0.8 };
  const sheet = { wide: 1.05, deep: 0.64 };
  const shut = open < 0.12;
  /** Across a top, 0 at the edge away from the rail and 1 at the rail's: `v` runs the other way
   * on the other side of the rail. */
  const across = (from: number, to: number): [number, number] =>
    stop.side === 1 ? [from, to] : [1 - to, 1 - from];
  const band = (u0: number, u1: number, from: number, to: number, fill: string): Decal => {
    const [v0, v1] = across(from, to);
    return { on: "top", rect: [u0, v0, u1, v1], fill };
  };
  out.push(
    part(c, yaw, mail.at, near, top, [mail.wide, mail.deep, 0.05], PAPER, {
      tag: "desk-envelope",
      lit: true,
      decals: shut
        ? [
            ...(fine
              ? Array.from({ length: 5 }, (_, k) => k).flatMap((k): Decal[] => {
                  const u = (k * 0.5) / 5;
                  const w = 0.5 / 5 + 0.01;
                  // The flap's point is toward the rail, where the camera is.
                  return [
                    band(u, u + w, 0.5 + k * 0.09, 0.6 + k * 0.09, "#8b949e"),
                    band(1 - u - w, 1 - u, 0.5 + k * 0.09, 0.6 + k * 0.09, "#8b949e"),
                  ];
                })
              : []),
            {
              on: "top",
              rect: [0.43, 0.36, 0.57, 0.36 + (0.14 * mail.wide) / mail.deep],
              fill: LIT,
              round: true,
            },
          ]
        : // Open: the dark of its mouth, along the edge the flap was folded on.
          [band(0.04, 0.96, 0.04, 0.26, "#57606a")],
    }),
  );
  if (!shut) {
    const back = easeOut((open - 0.12) / 0.2);
    const pull = easeOut((open - 0.3) / 0.28);
    const up = ease((open - 0.6) / 0.4);
    const lip = near - stop.side * (mail.deep / 2);
    // The flap, lying back on the desk behind the envelope.
    out.push(
      part(
        c,
        yaw,
        mail.at,
        lip - stop.side * ((FLAP * back) / 2),
        top,
        [mail.wide, FLAP * back + 0.01, 0.03],
        toneOf("#c9d1d9"),
        { tag: "desk-envelope", lit: true },
      ),
    );
    // What is written on the letter, measured down it from its top edge.
    const lines: [number, number, number, number, string][] = [
      [0.1, 0.5, 0.14, 0.23, "#2ea043"],
      [0.1, 0.9, 0.36, 0.41, "#8b949e"],
      [0.1, 0.9, 0.49, 0.54, "#8b949e"],
      [0.1, 0.9, 0.62, 0.67, "#8b949e"],
      [0.1, 0.6, 0.75, 0.8, "#8b949e"],
    ];
    const cream = toneOf("#f4efe3");
    if (pull > 0 && up <= 0) {
      // Coming out: only what is past the envelope's mouth is there to see, its top edge first.
      const shown = Math.max(0.02, pull);
      out.push(
        part(
          c,
          yaw,
          mail.at,
          lip - stop.side * ((sheet.deep * shown) / 2),
          top + 0.04 + 0.2 * pull,
          [sheet.wide, sheet.deep * shown, 0.02],
          cream,
          {
            tag: "desk-letter",
            lit: true,
            edge: false,
            decals: fine
              ? lines
                  .filter(([, , , to]) => to <= shown)
                  .map(([u0, u1, from, to, fill]) => band(u0, u1, from / shown, to / shown, fill))
              : [],
          },
        ),
      );
    } else if (up > 0) {
      // Up off the desk, along the camera's own line of sight (deskShot), unfolding on the way.
      const mix = (a: number, b: number) => a + (b - a) * up;
      out.push(
        part(
          c,
          yaw,
          mail.at,
          mix(
            lip - stop.side * (sheet.deep / 2),
            stop.side * (SHOT.look + LETTER_UP * SHOT.out * BACK[ctx.layout]),
          ),
          mix(top + 0.24, top + LETTER_UP * SHOT.up * BACK[ctx.layout]),
          [
            sheet.wide * mix(1, UNFOLDED[ctx.layout].wide),
            sheet.deep * mix(1, UNFOLDED[ctx.layout].deep),
            0.02,
          ],
          cream,
          {
            tag: "desk-letter",
            lit: true,
            edge: false,
            decals: fine
              ? lines.map(([u0, u1, from, to, fill]) => band(u0, u1, from, to, fill))
              : [],
          },
        ),
      );
    }
  }

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
