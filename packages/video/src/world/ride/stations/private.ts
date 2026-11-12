import { formatCount } from "../../../theme";
import { privateModel } from "../../scenes/private.model";
import { TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { NEAR_ENOUGH, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

const IRON = toneOf("#3b424c");
const BRASS = "#c9a24b";
const LONG = 5.2;
const DEEP = 2.6;
const TALL = 3.4;
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * What makes the block a vault, painted on its long faces: rivets along the two bands, a seam
 * between the door's plate and the figure's, hinges on the door, and bolts round its ring. An
 * open vault has no bolts shot.
 */
function fittings(open: boolean): Decal[] {
  const rivet = (u: number, v: number): Decal => ({
    on: "sides",
    rect: [u - 0.05 / LONG, v - 0.05 / TALL, u + 0.05 / LONG, v + 0.05 / TALL],
    fill: "#8b949e",
    round: true,
  });
  const out: Decal[] = [
    ...[0.04, 0.96].flatMap((v) =>
      Array.from({ length: 12 }, (_, k) => rivet(0.04 + k * (0.92 / 11), v)),
    ),
    { on: "sides", rect: [0.383, 0.1, 0.389, 0.9], fill: "#21262d" },
    { on: "sides", rect: [0.018, 0.28, 0.05, 0.4], fill: "#8b949e" },
    { on: "sides", rect: [0.018, 0.6, 0.05, 0.72], fill: "#8b949e" },
  ];
  if (!open) {
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      out.push(rivet(0.2 + (Math.cos(a) * 0.98) / LONG, 0.5 + (Math.sin(a) * 0.98) / TALL));
    }
  }
  return out;
}

/**
 * Private work: a locked vault. Its side carries the count and nothing else; no repository is
 * named anywhere on this station. The vault is lowered on as the train comes in and the figure
 * rises with it, exact when the train stops. A year with nothing private has the vault standing
 * open and empty; a count GitHub would not give has it shut with no figure at all, which is not
 * the same as zero. The sign says which, in the model's words.
 */
export const privateVault: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  // From high over the year the small paint cannot be seen and is left off (scenery.ts).
  const fine = ctx.overview < NEAR_ENOUGH;
  const model = privateModel(data);
  const out: Solid[] = plaza(ctx);
  const sign =
    model.kind === "count"
      ? "private contributions, counted"
      : model.kind === "none"
        ? "Nothing private this year"
        : "Private contributions couldn't be read";
  out.push(...nameBoard(ctx, [sign], { deep: PLAZA.deep, fit: true }));
  const landed = easeOut(build / 0.7);
  if (landed <= 0) return out;

  const open = model.kind === "none";
  // Bands of rivets top and bottom, and the door: a brass ring round a dark plate with a wheel.
  const decals: Decal[] = [
    { on: "all", rect: [0, 0, 1, 0.08], fill: "#2a3038" },
    { on: "all", rect: [0, 0.92, 1, 1], fill: "#565f6b" },
    { on: "sides", rect: [0.04, 0.16, 0.36, 0.84], fill: BRASS, round: true },
    {
      on: "sides",
      rect: [0.07, 0.21, 0.33, 0.79],
      fill: open ? "#0d1117" : "#2a3038",
      round: true,
    },
    ...(open
      ? []
      : [
          { on: "sides", rect: [0.15, 0.4, 0.25, 0.6], fill: BRASS, round: true } satisfies Decal,
          { on: "sides", rect: [0.11, 0.48, 0.29, 0.52], fill: BRASS } satisfies Decal,
          { on: "sides", rect: [0.19, 0.3, 0.21, 0.7], fill: BRASS } satisfies Decal,
        ]),
    // A bolt in each corner of the plate the figure is on, and a lid on top.
    ...[0.42, 0.95].flatMap((u) =>
      [0.16, 0.84].map(
        (v): Decal => ({
          on: "sides",
          rect: [u - 0.012, v - 0.025, u + 0.012, v + 0.025],
          fill: "#8b949e",
          round: true,
        }),
      ),
    ),
    { on: "top", rect: [0.06, 0.1, 0.94, 0.9], fill: "#4a535e" },
    ...(fine ? fittings(open) : []),
  ];
  const texts: FaceText[] = [];
  if (model.kind === "count") {
    // Before the vault has landed the figure rises (never below 1); at rest it is the exact count.
    const rising = Math.max(1, Math.round(model.count * Math.min(1, build) * 0.9));
    const shown = build >= 1 ? model.count : Math.min(rising, Math.max(1, model.count - 1));
    texts.push({
      on: "sides",
      rect: [0.4, 0.2, 0.97, 0.8],
      text: `${model.estimated ? "about " : ""}${formatCount(shown)}`,
      fill: "#ffffff",
    });
  }
  const drop = (1 - landed) * 5;
  out.push(
    // The floor the vault stands on, with a warning stripe round its edge.
    part(c, yaw, 0, 0, PLAZA_TOP, [LONG + 0.5, DEEP + 0.5, 0.25], TONE.dark, {
      tag: "base",
      under: 1,
      decals: fine
        ? Array.from(
            { length: 12 },
            (_, k): Decal => ({
              on: "all",
              rect: [k / 12, 0, (k + 0.5) / 12, 1],
              fill: "#e3b341",
            }),
          )
        : [],
    }),
    // Beside it: a cabinet of deposit boxes, each drawer with its brass keyhole.
    part(c, yaw, -(LONG / 2 + 1.25), 0, PLAZA_TOP + drop, [1.5, 2.0, 2.1], toneOf("#4a535e"), {
      tag: "lockers",
      lit: true,
      decals: fine
        ? [0, 1, 2].flatMap((col) =>
            [0, 1, 2].flatMap((row): Decal[] => {
              const u = 0.08 + col * 0.29;
              const v = 0.08 + row * 0.3;
              return [
                { on: "all", rect: [u, v, u + 0.25, v + 0.25], fill: "#2a3038" },
                {
                  on: "all",
                  rect: [u + 0.1, v + 0.09, u + 0.15, v + 0.16],
                  fill: BRASS,
                  round: true,
                },
              ];
            }),
          )
        : [],
    }),
    // On the other side: the keypad on its post, lit green when there is a count to open on.
    part(c, yaw, LONG / 2 + 1.1, stop.side * 0.7, PLAZA_TOP + drop, [0.26, 0.26, 1.05], TONE.dark, {
      tag: "keypad",
      edge: false,
    }),
    part(
      c,
      yaw,
      LONG / 2 + 1.1,
      stop.side * 0.7,
      PLAZA_TOP + 1.05 + drop,
      [0.56, 0.4, 0.62],
      TONE.ink,
      {
        tag: "keypad",
        lit: true,
        decals: fine
          ? [
              {
                on: "all",
                rect: [0.12, 0.62, 0.88, 0.9],
                fill: model.kind === "count" ? "#39d353" : "#da3633",
              },
              ...[0, 1, 2].flatMap((col) =>
                [0, 1].map(
                  (row): Decal => ({
                    on: "all",
                    rect: [
                      0.14 + col * 0.26,
                      0.1 + row * 0.24,
                      0.34 + col * 0.26,
                      0.28 + row * 0.24,
                    ],
                    fill: "#8b949e",
                  }),
                ),
              ),
            ]
          : [],
      },
    ),
  );
  // Two warning lamps behind the vault, lit in turn: one loop of 60 frames.
  const beat = Math.floor(((((frame % 60) + 60) % 60) / 60) * 2);
  [-1, 1].forEach((end, k) => {
    out.push(
      part(
        c,
        yaw,
        end * (LONG / 2 + 0.15),
        -stop.side * (DEEP / 2 + 0.45),
        PLAZA_TOP + drop,
        [0.1, 0.1, TALL + 0.5],
        TONE.mid,
        {
          tag: "lamp-post",
          edge: false,
        },
      ),
      part(
        c,
        yaw,
        end * (LONG / 2 + 0.15),
        -stop.side * (DEEP / 2 + 0.45),
        PLAZA_TOP + TALL + 0.5 + drop,
        [0.32, 0.32, 0.26],
        toneOf(k === beat ? "#ff7b72" : "#6e2a2a"),
        {
          tag: "warning-lamp",
          lit: true,
        },
      ),
    );
  });
  out.push(
    part(c, yaw, 0, 0, PLAZA_TOP + 0.25 + drop, [LONG, DEEP, TALL], IRON, {
      tag: "vault",
      lit: true,
      decals,
      texts,
    }),
  );
  return out;
};
