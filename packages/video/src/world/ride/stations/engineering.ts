import { formatCount } from "../../../theme";
import { planesModel } from "../../scenes/planes.model";
import { LIT, TONE, type Tone, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA_TOP, part, plaza, type Station } from "./kit";

/** The departures board: how wide it is, and its three rows in world units from its top. */
const BOARD = { wide: 9.2, tall: 3.05, lift: 0.5 };
/** The plaza is a little longer than usual: the board stands between a tower and a mast. */
const LONG = 10.8;
const ROWS: readonly [number, number][] = [
  [0.12, 1.3],
  [1.36, 2.08],
  [2.14, 2.86],
];
/** Where the strips lie across the plaza, from its middle: the board at the back, the apron, the runway by the rail. */
const BACK = 1.95;
const APRON = 0.35;
const RUNWAY = { at: 1.5, wide: 1.5, long: 9.0 };
const PAPER = toneOf("#e6edf3");
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * A small plane: a white body with a dark row of windows and a green nose, a wing across it and
 * a green fin on its tail. `along` points its nose down the plaza, the way planes in the air fly;
 * a parked one stands across, nose to the runway. Only the body carries `tag`: one body, one plane.
 */
function plane(
  ctx: { c: [number, number, number]; yaw: number },
  dx: number,
  dy: number,
  z: number,
  along: boolean,
  tag: string,
  toRunway = 1,
): Solid[] {
  const { c, yaw } = ctx;
  const long = along ? 1.0 : 0.86;
  const span = along ? 0.96 : 0.6;
  const glass: Decal = {
    on: along ? "sides" : "front",
    rect: [0.3, 0.45, 0.9, 0.8],
    fill: "#0d1117",
  };
  const body: [number, number, number] = along ? [long, 0.24, 0.2] : [0.24, long, 0.2];
  const wing: [number, number, number] = along ? [0.3, span, 0.05] : [span, 0.3, 0.05];
  const fin: [number, number, number] = along ? [0.2, 0.06, 0.24] : [0.06, 0.2, 0.24];
  // The tail is the end away from the nose: behind along the rail, or away from the runway.
  const tail = (long / 2 - 0.12) * (along ? -1 : -toRunway);
  return [
    part(c, yaw, dx, dy, z, body, PAPER, {
      tag,
      lit: true,
      decals: [
        glass,
        { on: "back", rect: [0.3, 0.45, 0.9, 0.8], fill: "#0d1117" },
        {
          on: "top",
          rect: along ? [0.82, 0, 1, 1] : [0, toRunway > 0 ? 0.82 : 0, 1, toRunway > 0 ? 1 : 0.18],
          fill: LIT,
        },
      ],
    }),
    part(c, yaw, dx, dy, z + 0.09, wing, toneOf("#c9d1d9"), { tag: "plane-part", lit: true }),
    part(c, yaw, dx + (along ? tail : 0), dy + (along ? 0 : tail), z + 0.2, fin, toneOf(LIT), {
      tag: "plane-part",
      lit: true,
      edge: false,
    }),
  ];
}

/**
 * Pull requests: a small airfield. The departures board carries the model's three rows (sent,
 * merged, reviews), each figure beside its words, hung between the control tower, whose light
 * turns, and a radar mast. One plane is in the air for each pull request still in flight and one
 * is parked on the apron for each merged, up to the model's cap; the board has the real numbers.
 * The runway by the rail has its centre line, its threshold bars and its edge lights, and a
 * windsock at its end. When GitHub could not say how many were merged, nothing is parked and the
 * row says so in words: not knowing is not zero. The planes in the air drift on a 60-frame loop.
 */
export const engineering: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  const model = planesModel(data);
  const out: Solid[] = plaza(ctx, LONG);
  const near = stop.side * RUNWAY.at;
  const apron = stop.side * APRON;
  const far = -stop.side * BACK;
  const loop = (((frame % 60) + 60) % 60) / 60;
  // The runway: centre line, threshold bars at both ends, a lit lamp every so often on each edge.
  out.push(
    part(c, yaw, 0, near, PLAZA_TOP, [RUNWAY.long, RUNWAY.wide, 0.04], TONE.ink, {
      tag: "runway",
      under: 1,
      decals: [
        ...[0.18, 0.31, 0.44, 0.56, 0.69, 0.82].map(
          (u): Decal => ({ on: "top", rect: [u - 0.035, 0.46, u + 0.035, 0.54], fill: "#c9d1d9" }),
        ),
        ...[0.02, 0.93].flatMap((u) =>
          [0.14, 0.32, 0.5, 0.68, 0.86].map(
            (v): Decal => ({ on: "top", rect: [u, v - 0.05, u + 0.05, v + 0.05], fill: "#c9d1d9" }),
          ),
        ),
        ...[0.03, 0.97].flatMap((v) =>
          [0.1, 0.23, 0.36, 0.5, 0.64, 0.77, 0.9].map(
            (u): Decal => ({
              on: "top",
              rect: [u - 0.008, v - 0.03, u + 0.008, v + 0.03],
              fill: "#ffd866",
            }),
          ),
        ),
      ],
    }),
    // The apron the parked planes stand on, with a stand line for each.
    part(c, yaw, 0, apron, PLAZA_TOP, [RUNWAY.long, 1.3, 0.03], TONE.dark, {
      tag: "apron",
      under: 1,
      decals: [{ on: "top", rect: [0.02, 0.44, 0.98, 0.56], fill: "#e3b341" }],
    }),
    // The windsock at the runway's far end: a pole and a striped sock that lifts and falls.
    part(
      c,
      yaw,
      RUNWAY.long / 2 - 0.2,
      near + stop.side * 0.55,
      PLAZA_TOP,
      [0.08, 0.08, 1.3],
      TONE.mid,
      {
        tag: "windsock",
        edge: false,
      },
    ),
    part(
      c,
      yaw,
      RUNWAY.long / 2 - 0.55,
      near + stop.side * 0.55,
      PLAZA_TOP + 1.05 + Math.sin(loop * Math.PI * 2) * 0.05,
      [0.7, 0.2, 0.22],
      toneOf("#ff9a5c"),
      {
        tag: "windsock",
        lit: true,
        decals: [0.2, 0.6].map(
          (u): Decal => ({ on: "all", rect: [u, 0, u + 0.2, 1], fill: "#f0f6fc" }),
        ),
      },
    ),
  );
  const landed = easeOut(build / 0.4);
  if (landed <= 0) return out;
  const drop = (1 - landed) * 5;

  // Before the board has landed a figure rises (never below 1 for a count that is not zero).
  const rising = (value: string, n: number) => {
    if (build >= 1 || n === 0) return value;
    const shown = Math.min(Math.max(1, Math.round(n * build * 0.9)), Math.max(1, n - 1));
    return `${value.startsWith("about ") ? "about " : ""}${formatCount(shown)}`;
  };
  const counts = [model.sent, model.merged ?? 0, model.reviews];
  // The figures' column is as wide as the longest of them needs ("about 1,011" is not "57").
  const longest = Math.max(...model.rows.map((row) => row.value?.length ?? 0));
  const split = Math.max(0.2, Math.min(0.46, 0.06 + longest * 0.04));
  const texts: FaceText[] = model.rows.flatMap((row, i): FaceText[] => {
    const [top, bottom] = ROWS[i] ?? [0, 1];
    const v0 = 1 - bottom / BOARD.tall;
    const v1 = 1 - top / BOARD.tall;
    const fill = i === 0 ? "#ffffff" : "#c9d1d9";
    if (row.value === null)
      return [{ on: "sides", rect: [0.03, v0, 0.97, v1], text: row.label, fill, weight: 700 }];
    return [
      {
        on: "sides",
        rect: [0.03, v0, split, v1],
        text: rising(row.value, counts[i] ?? 0),
        fill: "#ffffff",
      },
      { on: "sides", rect: [split + 0.03, v0, 0.97, v1], text: row.label, fill, weight: 700 },
    ];
  });
  const top = PLAZA_TOP + BOARD.lift + BOARD.tall;
  out.push(
    part(c, yaw, 0, far, PLAZA_TOP + BOARD.lift + drop, [BOARD.wide, 0.16, BOARD.tall], TONE.ink, {
      tag: "departures",
      lit: true,
      texts,
      decals: [
        { on: "sides", rect: [0, 0, 1, 0.03], fill: LIT },
        // A rule under each row but the last, like a board of flights.
        ...ROWS.slice(0, 2).map(
          ([, bottom]): Decal => ({
            on: "sides",
            rect: [
              0.02,
              1 - (bottom + 0.035) / BOARD.tall,
              0.98,
              1 - (bottom + 0.015) / BOARD.tall,
            ],
            fill: "#30363d",
          }),
        ),
      ],
    }),
  );

  // The board hangs between the control tower and the radar mast, one at each end.
  const ends = BOARD.wide / 2 + 0.36;
  out.push(
    // The tower: a shaft with lit slits, a glass cab over the board's top, a roof.
    part(
      c,
      yaw,
      -ends,
      far,
      PLAZA_TOP + drop,
      [0.6, 0.6, top - PLAZA_TOP + 0.15],
      toneOf("#8b949e"),
      {
        tag: "tower",
        decals: [0.2, 0.4, 0.6, 0.8].map(
          (v): Decal => ({ on: "all", rect: [0.36, v - 0.03, 0.64, v + 0.03], fill: "#ffd866" }),
        ),
      },
    ),
    part(c, yaw, -ends, far, top + 0.15 + drop, [0.95, 0.95, 0.5], TONE.ink, {
      tag: "tower",
      lit: true,
      decals: [{ on: "all", rect: [0.06, 0.16, 0.94, 0.84], fill: "#79c0ff" }],
    }),
    part(c, yaw, -ends, far, top + 0.65 + drop, [1.05, 1.05, 0.12], TONE.dark, { tag: "tower" }),
    // The mast: a lattice of dark and light bands, and the dish on top, which turns.
    part(
      c,
      yaw,
      ends,
      far,
      PLAZA_TOP + drop,
      [0.3, 0.3, top - PLAZA_TOP + 0.4],
      toneOf("#da3633"),
      {
        tag: "mast",
        decals: [0.25, 0.75].map(
          (v): Decal => ({ on: "all", rect: [0, v - 0.125, 1, v + 0.125], fill: "#f0f6fc" }),
        ),
      },
    ),
  );
  // What turns: the tower's light and the mast's dish, once every 60 frames, about their own posts.
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const turning = (
    dx: number,
    z: number,
    size: [number, number, number],
    tone: Tone,
    tag: string,
  ): Solid => {
    const mid: [number, number] = [c[0] + dx * cos - far * sin, c[1] + dx * sin + far * cos];
    return {
      kind: "box",
      at: [mid[0] - size[0] / 2, mid[1] - size[1] / 2, z + drop],
      size,
      tone,
      pivot: mid,
      yaw: yaw + loop * Math.PI * 2,
      lit: true,
      tag,
    };
  };
  out.push(
    turning(-ends, top + 0.77, [0.7, 0.16, 0.16], TONE.lamp, "tower-light"),
    turning(ends, top + 0.4, [0.9, 0.14, 0.42], toneOf("#c9d1d9"), "dish"),
  );

  // Parked planes roll out onto the apron one after another, noses to the runway; the ones in
  // flight come down to their height over the second half of the build.
  for (let i = 0; i < model.drawnLanded; i++) {
    const out1 = easeOut((build - 0.3 - i * 0.03) / 0.3);
    if (out1 <= 0) continue;
    const dx = (i - (model.drawnLanded - 1) / 2) * 0.7;
    out.push(
      ...plane(ctx, dx, apron, PLAZA_TOP + 0.05 + (1 - out1) * 4, false, "plane-parked", stop.side),
    );
  }
  const up = easeOut((build - 0.5) / 0.5);
  if (up <= 0) return out;
  // In the air: two lines over the runway, staggered, each plane at its own height.
  for (let i = 0; i < model.drawnFlying; i++) {
    const phase = (loop + i / 5) * Math.PI * 2;
    const dx = (i - (model.drawnFlying - 1) / 2) * 0.68 + Math.sin(phase) * 0.22;
    const lane = near + (i % 2 === 0 ? -0.5 : 0.5) * stop.side;
    const z = top + 0.7 + (i % 3) * 0.42 + Math.cos(phase) * 0.12 + (1 - up) * 6;
    out.push(...plane(ctx, dx, lane, z, true, "plane-flying"));
  }
  return out;
};
