import { formatCount } from "../../../theme";
import { planesModel } from "../../scenes/planes.model";
import { LIT, TONE, type Tone, toneOf } from "../palette";
import type { Box, Decal, FaceText, Solid } from "../prims";
import { PLAZA_TOP, part, plaza, type Station } from "./kit";

/** The board of counts: how wide it is, and its three rows in world units from its top. */
const BOARD = { wide: 9.2, tall: 3.05, lift: 0.5 };
/** The plaza is a little longer than usual: the board stands between two signals. */
const LONG = 10.8;
const ROWS: readonly [number, number][] = [
  [0.12, 1.3],
  [1.36, 2.08],
  [2.14, 2.86],
];
/** Where things lie across the plaza, from its middle: the board at the back, the main line by the rail. */
const BACK = 1.95;
const MAIN = { at: 1.45, long: 10.2, wide: 0.9 };
/** The branch lines: where each joins the main line, how long it is, and the angle it comes in at. */
const JOINS = [-2.5, 0.6, 3.7];
const BRANCH = { long: 3.0, angle: 0.56 };
/** A wagon, and how far apart wagons stand on a line. */
const WAGON = { long: 0.6, wide: 0.5, tall: 0.42, pitch: 0.72 };
const MERGED = toneOf("#2ea043");
const OPEN = toneOf("#e3b341");
const BALLAST = toneOf("#3a424d");
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/** A stretch of track's paint: sleepers across it and two rails along it. */
function trackPaint(long: number): Decal[] {
  const sleepers = Math.max(3, Math.round(long / 0.45));
  return [
    ...Array.from(
      { length: sleepers },
      (_, k): Decal => ({
        on: "top",
        rect: [(k + 0.3) / sleepers, 0.08, (k + 0.6) / sleepers, 0.92],
        fill: "#6e5a48",
      }),
    ),
    { on: "top", rect: [0, 0.2, 1, 0.28], fill: "#c9d1d9" },
    { on: "top", rect: [0, 0.72, 1, 0.8], fill: "#c9d1d9" },
  ];
}

/**
 * Pull requests: a junction. The main line runs along the plaza by the rail, and three branch
 * lines come in to it from behind, as a branch is merged into main. One wagon stands on the main
 * line, coupled in a row, for each pull request merged, and one waits on a branch for each still
 * open, up to the model's cap; the board behind carries the model's three rows (sent, merged,
 * reviews), each figure beside its words, between two signals whose lights change. When GitHub
 * could not say how many were merged, no wagon is on the main line and the row says so in words:
 * not knowing is not zero. The wagons on the branches shunt a little, on a 60-frame loop.
 */
export const engineering: Station = (ctx) => {
  const { data, c, yaw, build, frame, stop } = ctx;
  const model = planesModel(data);
  const out: Solid[] = plaza(ctx, LONG);
  const side = stop.side;
  const far = -side * BACK;
  const loop = (((frame % 60) + 60) % 60) / 60;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  /**
   * A box turned about its own middle: `dx` along the rail and `dy` across it from the plaza's
   * middle, turned `turn` more than the plaza. A branch line and what stands on it lie askew.
   */
  const askew = (
    dx: number,
    dy: number,
    z: number,
    size: [number, number, number],
    tone: Tone,
    turn: number,
    extra: Partial<Box>,
  ): Box => {
    const mid: [number, number] = [c[0] + dx * cos - dy * sin, c[1] + dx * sin + dy * cos];
    return {
      kind: "box",
      at: [mid[0] - size[0] / 2, mid[1] - size[1] / 2, c[2] + z],
      size,
      tone,
      pivot: mid,
      yaw: yaw + turn,
      ...extra,
    };
  };
  /** A point `t` along branch `k` from its far end (0) to where it joins the main line (1). */
  const turn = side * BRANCH.angle;
  const onBranch = (k: number, t: number): [number, number] => {
    const back = (1 - t) * BRANCH.long;
    return [
      (JOINS[k] ?? 0) - Math.cos(BRANCH.angle) * back,
      side * (MAIN.at - Math.sin(BRANCH.angle) * back),
    ];
  };
  const wagonPaint = (load: string): Decal[] => [
    { on: "top", rect: [0.1, 0.12, 0.9, 0.88], fill: load },
    { on: "all", rect: [0, 0, 1, 0.3], fill: "#161b22" },
    ...[0.14, 0.62].map(
      (u): Decal => ({ on: "sides", rect: [u, 0, u + 0.24, 0.34], fill: "#c9d1d9", round: true }),
    ),
  ];

  // The lines are there from the start: the main line, the three branches under it, and a
  // buffer at each branch's far end.
  JOINS.forEach((_, k) => {
    const [mx, my] = onBranch(k, 0.5);
    out.push(
      askew(mx, my, PLAZA_TOP, [BRANCH.long, 0.8, 0.05], BALLAST, turn, {
        tag: "branch",
        under: 2,
        edge: false,
        decals: trackPaint(BRANCH.long),
      }),
    );
    const [bx, by] = onBranch(k, -0.04);
    out.push(
      askew(bx, by, PLAZA_TOP + 0.05, [0.16, 0.86, 0.34], toneOf("#da3633"), turn, {
        tag: "buffer",
        decals: [{ on: "all", rect: [0, 0.35, 1, 0.65], fill: "#f0f6fc" }],
      }),
    );
  });
  out.push(
    part(c, yaw, 0, side * MAIN.at, PLAZA_TOP, [MAIN.long, MAIN.wide, 0.06], BALLAST, {
      tag: "main-line",
      under: 1,
      edge: false,
      decals: trackPaint(MAIN.long),
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
  const top = PLAZA_TOP + BOARD.lift + BOARD.tall;
  out.push(
    part(c, yaw, 0, far, PLAZA_TOP + BOARD.lift + drop, [BOARD.wide, 0.16, BOARD.tall], TONE.ink, {
      tag: "pr-board",
      lit: true,
      texts,
      decals: [
        { on: "sides", rect: [0, 0, 1, 0.03], fill: LIT },
        // A rule under each row but the last.
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

  // A signal at each end of the board: a mast and a head of three lamps. Green shows on one
  // while amber shows on the other, and they change over twice a loop.
  const ends = BOARD.wide / 2 + 0.36;
  const swap = Math.floor(loop * 2) % 2;
  [-ends, ends].forEach((dx, k) => {
    const green = (k + swap) % 2 === 0;
    const lamp = (v: number, on: boolean, colour: string): Decal => ({
      on: "sides",
      rect: [0.2, v, 0.8, v + 0.2],
      fill: on ? colour : "#30363d",
      round: true,
    });
    out.push(
      part(c, yaw, dx, far, PLAZA_TOP + drop, [0.16, 0.16, top - PLAZA_TOP - 0.5], TONE.mid, {
        tag: "signal",
        edge: false,
      }),
      part(c, yaw, dx, far, top - 0.5 + drop, [0.42, 0.3, 1.26], TONE.ink, {
        tag: "signal",
        lit: true,
        decals: [lamp(0.7, false, "#da3633"), lamp(0.4, !green, "#e3b341"), lamp(0.1, green, LIT)],
      }),
    );
  });

  // Merged: wagons coupled in a row on the main line, set down one after another.
  for (let i = 0; i < model.drawnLanded; i++) {
    const on = easeOut((build - 0.3 - i * 0.03) / 0.3);
    if (on <= 0) continue;
    const dx = (i - (model.drawnLanded - 1) / 2) * WAGON.pitch;
    out.push(
      part(
        c,
        yaw,
        dx,
        side * MAIN.at,
        PLAZA_TOP + 0.06 + (1 - on) * 4,
        [WAGON.long, WAGON.wide, WAGON.tall],
        MERGED,
        { tag: "pr-merged", lit: true, decals: wagonPaint(LIT) },
      ),
    );
    // The coupling to the wagon before it.
    if (i > 0 && on >= 1) {
      out.push(
        part(
          c,
          yaw,
          dx - WAGON.pitch / 2,
          side * MAIN.at,
          PLAZA_TOP + 0.16,
          [0.14, 0.08, 0.06],
          TONE.dark,
          {
            tag: "coupling",
            edge: false,
          },
        ),
      );
    }
  }
  // Open: wagons waiting on the branches, the first nearest the main line. They come down over
  // the second half of the build, and shunt a little back and forth.
  const up = easeOut((build - 0.5) / 0.5);
  if (up <= 0) return out;
  for (let i = 0; i < model.drawnFlying; i++) {
    const k = i % JOINS.length;
    const place = Math.floor(i / JOINS.length);
    const shunt = Math.sin((loop + i / 5) * Math.PI * 2) * 0.03;
    const [wx, wy] = onBranch(k, 0.78 - place * (WAGON.pitch / BRANCH.long) + shunt);
    out.push(
      askew(
        wx,
        wy,
        PLAZA_TOP + 0.05 + (1 - up) * 6,
        [WAGON.long, WAGON.wide, WAGON.tall],
        OPEN,
        turn,
        { tag: "pr-open", lit: true, decals: wagonPaint("#f5d36b") },
      ),
    );
  }
  return out;
};
