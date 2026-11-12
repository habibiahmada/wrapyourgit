import { formatCount } from "../../../theme";
import { planesModel } from "../../scenes/planes.model";
import { LIT, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA_TOP, part, plaza, type Station } from "./kit";

/** The departures board: how wide it is, and its three rows in world units from its top. */
const BOARD = { wide: 9.2, tall: 3.05, lift: 0.5 };
const ROWS: readonly [number, number][] = [
  [0.12, 1.3],
  [1.36, 2.08],
  [2.14, 2.86],
];
const PAPER = toneOf("#e6edf3");
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/** A paper plane from three boxes: body, wings, tail. `along` points its nose down the plaza. */
function plane(
  ctx: { c: [number, number, number]; yaw: number },
  dx: number,
  dy: number,
  z: number,
  along: boolean,
  tag: string,
): Solid[] {
  const { c, yaw } = ctx;
  const body: [number, number, number] = along ? [0.72, 0.2, 0.16] : [0.2, 0.72, 0.16];
  const wings: [number, number, number] = along ? [0.24, 0.66, 0.05] : [0.66, 0.24, 0.05];
  return [
    part(c, yaw, dx, dy, z, body, PAPER, { tag, lit: true }),
    part(c, yaw, dx, dy, z + 0.08, wings, toneOf(LIT), {
      tag: "plane-part",
      lit: true,
      edge: false,
    }),
  ];
}

/**
 * Pull requests: a small airfield. The departures board carries the model's three rows (sent,
 * merged, reviews), each figure beside its words. One paper plane is in the air for each pull
 * request still in flight and one is parked on the runway for each merged, up to the model's
 * cap; the board has the real numbers. When GitHub could not say how many were merged, nothing
 * is parked and the row says so in words: not knowing is not zero. The planes in the air drift
 * on a 60-frame loop.
 */
export const engineering: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  const model = planesModel(data);
  const out: Solid[] = plaza(ctx);
  const near = stop.side * 1.2;
  const far = -stop.side * 1.5;
  // The runway, with its dashed middle line.
  out.push(
    part(c, yaw, 0, near, PLAZA_TOP, [8.8, 1.5, 0.04], TONE.ink, {
      tag: "runway",
      under: 1,
      decals: [0.1, 0.26, 0.42, 0.58, 0.74, 0.9].map(
        (u): Decal => ({ on: "top", rect: [u - 0.04, 0.46, u + 0.04, 0.54], fill: "#c9d1d9" }),
      ),
    }),
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
  for (const post of [-3, 3]) {
    out.push(
      part(c, yaw, post, far, PLAZA_TOP + drop, [0.16, 0.16, BOARD.lift], TONE.dark, {
        tag: "board-post",
        edge: false,
      }),
    );
  }
  const top = PLAZA_TOP + BOARD.lift + BOARD.tall;
  out.push(
    part(c, yaw, 0, far, PLAZA_TOP + BOARD.lift + drop, [BOARD.wide, 0.16, BOARD.tall], TONE.ink, {
      tag: "departures",
      lit: true,
      texts,
      decals: [{ on: "sides", rect: [0, 0, 1, 0.03], fill: LIT }],
    }),
  );

  // Parked planes roll out along the runway one after another; the ones in flight come down to
  // their height over the second half of the build.
  for (let i = 0; i < model.drawnLanded; i++) {
    const out1 = easeOut((build - 0.3 - i * 0.03) / 0.3);
    if (out1 <= 0) continue;
    const dx = (i - (model.drawnLanded - 1) / 2) * 0.72;
    out.push(...plane(ctx, dx, near, PLAZA_TOP + 0.06 + (1 - out1) * 4, false, "plane-parked"));
  }
  const up = easeOut((build - 0.5) / 0.5);
  if (up <= 0) return out;
  const loop = (((frame % 60) + 60) % 60) / 60;
  for (let i = 0; i < model.drawnFlying; i++) {
    const phase = (loop + i / 5) * Math.PI * 2;
    const dx = (i - (model.drawnFlying - 1) / 2) * 0.78 + Math.sin(phase) * 0.25;
    const z = top + 0.7 + (i % 3) * 0.42 + Math.cos(phase) * 0.12 + (1 - up) * 6;
    out.push(...plane(ctx, dx, near, z, true, "plane-flying"));
  }
  return out;
};
