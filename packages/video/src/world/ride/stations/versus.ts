import { formatCount } from "../../../theme";
import { MAX_TILT, seesawModel } from "../../scenes/seesaw.model";
import { GREENS, LIT, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { board, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

/** How far each pan's middle is from the fulcrum, along the rail. */
const ARM = 2.05;
const PAN = { long: 3.0, deep: 2.3, thick: 0.22 };
const WEIGHT = { long: 2.8, deep: 1.9 };
/** How high the beam's middle rests, and how far an end drops at full tilt. */
const PIVOT = 1.0;
const DROP = 0.6;
/** A weight's height: room for its year and its figure, plus its share of the larger year. */
const LOWEST = 2.1;
const RISE = 1.0;
/** Down a weight's side, in world units from its top: the year, then the figure. */
const YEAR = { top: 0.16, bottom: 0.7 };
const FIGURE = { top: 0.8, bottom: 1.9 };
/** The beam between the pans, drawn as short level steps: every face stays flat and square. */
const STEPS = 5;
const LAST = toneOf("#545d68");
const THIS = toneOf(GREENS[1]);
/** The sign: long enough for "Contributions, year over year" on one row, and short enough to end before the month sign behind it. */
const SIGN_WIDE = 7.4;
/** How high the readout hangs: over the taller weight on the higher end of the beam. */
const READOUT = PLAZA_TOP + PIVOT + DROP + LOWEST + RISE + 0.35;
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * This year against last year: a seesaw with one weight per year. Each weight wears its year and
 * its contributions on every side and is as tall as its share of the larger year; the heavier
 * one's end of the beam hangs lower, by the model's angle. The weights are lowered on one after
 * the other as the train comes in, the figures rise with them and are exact when it stops, and
 * the beam then tips and keeps a slow sway. The change is printed large on a board held
 * over the seesaw; the sign carries the title and the span both years cover. When last year could not be read its weight stays
 * under a cover with no figure, the beam stays level, and the sign says so: that is not a zero.
 */
export const versus: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  const model = seesawModel(data);
  const known = !("unavailable" in model);
  const out: Solid[] = plaza(ctx);
  out.push(
    ...nameBoard(
      ctx,
      known
        ? ["Contributions, year over year", { text: model.span, tall: 0.4 }]
        : ["Year over year", { text: "Last year couldn't be read from GitHub", tall: 0.4 }],
      // Wide enough for each line on one row: two rows stand lower than the beam, so the seesaw
      // shows over the sign.
      { deep: PLAZA.deep, fit: true, wide: SIGN_WIDE, scale: 1.25 },
    ),
  );
  // What the weighing says, on a board held over the seesaw like a scale's readout. It is the
  // station's finding, so it gets headline size, and up there nothing stands in front of it.
  if (known) {
    out.push(
      ...board(
        c,
        yaw,
        0,
        -stop.side * (WEIGHT.deep / 2 + 0.25),
        Math.max(2.6, model.change.length * 0.46),
        [{ text: model.change, tall: 0.8, fill: LIT }],
        "along",
        READOUT,
      ),
    );
  }

  // The beam tips once both weights are on, then sways a little; the sway repeats every 60 frames.
  const settle = easeOut((build - 0.6) / 0.4);
  const sway = build >= 1 ? Math.sin((frame / 60) * Math.PI * 2) * 0.035 : 0;
  const tilt = known ? (model.angle / MAX_TILT) * DROP * settle + sway * Math.sign(model.angle) : 0;
  /** The beam's top at `dx` along it: this year's end (ahead) goes down when this year is heavier. */
  const beamTop = (dx: number) => PLAZA_TOP + PIVOT - tilt * (dx / ARM);

  out.push(
    part(c, yaw, 0, 0, PLAZA_TOP, [1.5, PAN.deep + 0.3, 0.3], TONE.dark, { tag: "base", under: 1 }),
    part(c, yaw, 0, 0, PLAZA_TOP + 0.3, [0.7, PAN.deep - 0.5, PIVOT - 0.3 - 0.2], TONE.mid, {
      tag: "fulcrum",
      decals: [{ on: "all", rect: [0, 0.86, 1, 1], fill: "#8b949e" }],
    }),
  );
  const inner = ARM - PAN.long / 2;
  for (let i = 0; i < STEPS; i++) {
    const dx = -inner + ((i + 0.5) * (2 * inner)) / STEPS;
    out.push(
      part(c, yaw, dx, 0, beamTop(dx) - 0.2, [(2 * inner) / STEPS, 0.9, 0.2], TONE.rail, {
        tag: "beam",
        edge: false,
      }),
    );
  }

  const most = known ? Math.max(model.last.value, model.current.value) : model.current.value;
  const sides = [
    { dx: -ARM, year: known ? model.last : null, tone: LAST, order: 0 },
    { dx: ARM, year: model.current, tone: THIS, order: 1 },
  ];
  for (const side of sides) {
    const foot = beamTop(side.dx);
    out.push(
      part(c, yaw, side.dx, 0, foot - PAN.thick, [PAN.long, PAN.deep, PAN.thick], TONE.rail, {
        tag: "pan",
        decals: [{ on: "all", rect: [0, 0, 1, 0.3], fill: "#545d68" }],
      }),
    );
    if (!side.year) {
      // Last year's weight under its cover: something is there, and nobody could read it.
      out.push(
        part(c, yaw, side.dx, 0, foot, [WEIGHT.long, WEIGHT.deep, LOWEST], TONE.dark, {
          tag: "covered",
          decals: [0.2, 0.4, 0.6, 0.8].map(
            (v): Decal => ({ on: "all", rect: [0.06, v - 0.03, 0.94, v + 0.03], fill: "#545d68" }),
          ),
        }),
      );
      continue;
    }
    const landed = easeOut((build - side.order * 0.2) / 0.45);
    if (landed <= 0) continue;
    const { value } = side.year;
    const tall = LOWEST + (most > 0 ? value / most : 0) * RISE;
    // Before a weight has landed its figure rises (never below 1 for a year that has some); at rest it is exact.
    const rising = Math.max(1, Math.round(value * Math.min(1, build) * 0.9));
    const shown = build >= 1 || value === 0 ? value : Math.min(rising, Math.max(1, value - 1));
    const row = (band: { top: number; bottom: number }): [number, number, number, number] => [
      0.05,
      1 - band.bottom / tall,
      0.95,
      1 - band.top / tall,
    ];
    const texts: FaceText[] = [
      { on: "all", rect: row(YEAR), text: String(side.year.year), fill: "#e6edf3", weight: 700 },
      { on: "all", rect: row(FIGURE), text: formatCount(shown), fill: "#ffffff" },
    ];
    out.push(
      part(
        c,
        yaw,
        side.dx,
        0,
        foot + (1 - landed) * 5,
        [WEIGHT.long, WEIGHT.deep, tall],
        side.tone,
        {
          tag: "weight",
          lit: true,
          texts,
          // A cast-iron weight: a dark foot and a lifting bar across the top.
          decals: [
            { on: "all", rect: [0, 0, 1, 0.1 / tall], fill: "#161b22" },
            { on: "top", rect: [0.2, 0.4, 0.8, 0.6], fill: "#161b22" },
          ],
        },
      ),
    );
  }
  return out;
};
