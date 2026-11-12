import { ARCHETYPE_LABELS } from "../../../copy";
import { formatCount } from "../../../theme";
import { closingModel } from "../../scenes/closing.model";
import { GREENS, LIT, TONE, toneOf } from "../palette";
import type { FaceText, Solid } from "../prims";
import type { V3 } from "../project";
import type { RideStop } from "../stops";
import { at, heading } from "../track";
import { board, PLAZA_TOP, part, type Station } from "./kit";

const GOLD = toneOf("#ffd866");
const GOLD_LIGHT = toneOf("#ffe9a3");
const CARPET = toneOf("#c23b22");
/** Balloons, bunting, gifts and confetti: the ride's green, gold, paper and the brand's persimmon. */
const PARTY = [LIT, "#ffd866", "#f4efe3", "#e4572e"] as const;

/**
 * The plaza across the rail from the camera, a little behind the engine: its middle, along the
 * rail and out from it. Every other place below is in the plaza's own frame: `dx` along the rail,
 * `dy` away from it.
 */
const AT = { dx: -7, dy: 5.8 } as const;
const SLAB = { long: 14, deep: 7 } as const;
/** The gate at the plaza's back. */
const GATE = { dy: 2.8, wide: 8.4, lift: 2.4 } as const;
/** The podium in front of the gate, and how deep its steps are. */
const PODIUM_DY = -0.4;
const STEP_DEEP = 1.8;
/** The three steps, along the rail from the plaza's middle: their width and height. */
const STEPS = [
  { dx: -4.15, wide: 4.1, tall: 1.45 },
  { dx: 0, wide: 4.2, tall: 1.85 },
  { dx: 3.95, wide: 3.7, tall: 1.25 },
] as const;
/**
 * Where Cell stands on the top step: beside the trophy, on its side nearer the camera, and a
 * little in front of it, so the trophy never hides it.
 */
const PERCH = { dx: 1.35, dy: -0.5 } as const;
/** The tallest month bar on the gate's crown. */
const BAR_MAX = 1.2;
const DROP = 12;
/** The banner's height: the board's two rows and its margins (kit `board`). */
const BANNER_TALL = 0.16 * 2 + 0.6 + 1.3 + 0.12;

/**
 * The plaza's middle and turn for `stop`. It stands on the stop's side, across the rail from the
 * camera, on the rail's own line as every plaza does, so a curve before the terminus turns it with
 * the rail. Built facing left of the rail, it is turned half round on the right, so it still reads
 * left to right from the camera.
 */
function plazaFrame(stop: RideStop): { pc: V3; pyaw: number } {
  return {
    pc: at(stop.s + AT.dx, stop.side * AT.dy),
    pyaw: heading(stop.s + AT.dx) + (stop.side === 1 ? Math.PI : 0),
  };
}

/** Where Cell stands at the closing stop: on the podium's top step, beside the trophy. */
export function closingPerch(stop: RideStop): V3 {
  const { pc, pyaw } = plazaFrame(stop);
  // The camera looks along the rail at a slant: beside the trophy toward the way the train came is
  // nearer it on the left of the rail, and the other way on the right, where the plaza is turned.
  const dx = stop.side === 1 ? -PERCH.dx : PERCH.dx;
  return placed(pc, pyaw, dx, PODIUM_DY + PERCH.dy, PLAZA_TOP + (STEPS[1]?.tall ?? 1.85));
}

/**
 * The terminus is a party on a plaza beyond the rail. At its back a gate carries the date and the
 * year, crowned by twelve bars as tall as each month's contributions, with bunches of balloons on
 * strings at its ends. In front, a podium: the archetype on its top step with a gold trophy (and
 * Cell, who hops off the train to stand by it), the contributions on the left step, the active
 * days on the right. A red carpet runs to it from the rail, gifts are stacked at its feet, two
 * spotlights face it, and strings of flags and bulbs run from the plaza's back corners to the
 * gate. Confetti falls and fireworks open over it, all on a 60-frame loop. Everything is lowered
 * in as the train comes in, in turn: gate, podium, trophy.
 */
export const closing: Station = ({ data, stop, c, yaw, frame, build }) => {
  const model = closingModel(data);
  const { pc, pyaw } = plazaFrame(stop);
  // The slab and the carpet are ground: there before the party.
  const out: Solid[] = [...buffers(c, yaw), ...slab(pc, pyaw), ...carpet(pc, pyaw)];
  const loop = (((frame % 60) + 60) % 60) / 60;
  const landed = (delay: number) => Math.max(0, Math.min(1, (build - delay) / 0.6));
  const drop = (delay: number) => DROP * (1 - landed(delay)) ** 2;
  const put = (dx: number, dy: number, z: number, size: V3, tone = TONE.dark, extra = {}) =>
    part(pc, pyaw, dx, dy, z, size, tone, extra);

  // The gate: a banner on two posts, the months on its crown, balloons at its ends.
  if (landed(0.1) > 0) {
    const z = PLAZA_TOP + drop(0.1);
    out.push(
      ...board(
        [pc[0], pc[1], pc[2] + z],
        pyaw,
        0,
        GATE.dy,
        GATE.wide,
        [
          { text: model.date, tall: 0.6, fill: "#c9d1d9", weight: 700 },
          { text: String(model.year), tall: 1.3, fill: LIT },
        ],
        "along",
        GATE.lift,
        "gate",
      ),
    );
    const top = z + GATE.lift + BANNER_TALL;
    const monthly = data.contributions.monthly;
    const most = Math.max(0, ...monthly);
    const bar = (GATE.wide - 0.6) / 12;
    monthly.forEach((count, m) => {
      const share = most > 0 ? count / most : 0;
      out.push(
        put(
          -GATE.wide / 2 + 0.3 + bar * (m + 0.5),
          GATE.dy,
          top,
          [bar * 0.72, 0.3, 0.2 + BAR_MAX * share],
          toneOf(GREENS[Math.min(3, Math.ceil(share * 3))] ?? LIT),
          { lit: true, tag: "month" },
        ),
      );
    });
    for (const side of [-1, 1]) {
      // Tied at the banner's top corners, on short strings, so they stay under the frame's top.
      out.push(
        ...balloons(
          pc,
          pyaw,
          side * (GATE.wide / 2 + 0.25),
          GATE.dy,
          top - 0.6,
          4,
          loop,
          side,
          0.55,
        ),
      );
    }
    out.push(...bunting(pc, pyaw, z, loop));
  }

  // The podium: the numbers on its long faces, the archetype on the top step; the gifts at its
  // feet and the spotlights facing it.
  if (landed(0.25) > 0) {
    const z = PLAZA_TOP + drop(0.25);
    const total = data.contributions.total;
    const days = data.contributions.activeDays;
    const archetype = data.identity.archetype ? ARCHETYPE_LABELS[data.identity.archetype] : null;
    const labels: [string, string][] = [
      [formatCount(total), total === 1 ? "contribution" : "contributions"],
      [archetype ?? String(model.year), archetype ? "this year" : "your year"],
      [formatCount(days), days === 1 ? "active day" : "active days"],
    ];
    STEPS.forEach((step, i) => {
      const [big, small] = labels[i] ?? ["", ""];
      const texts: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => [
        { on, rect: [0.05, 0.5, 0.95, 0.92], text: big, fill: "#ffffff", weight: 800 },
        { on, rect: [0.02, 0.06, 0.98, 0.48], text: small, fill: "#c9d1d9", weight: 700 },
      ]);
      out.push(
        put(step.dx, PODIUM_DY, z, [step.wide, STEP_DEEP, step.tall], TONE.dark, {
          lit: true,
          tag: "podium",
          texts,
          decals: [
            { on: "top", rect: [0, 0, 1, 1], fill: i === 1 ? "#ffd866" : "#3a424d" },
            // A gold rim along the step's top edge.
            { on: "all", rect: [0, 0.94, 1, 1], fill: "#ffd866" },
          ],
        }),
      );
    });
    // Bunches tied to the outer steps' far corners.
    const outer = [STEPS[0], STEPS[2]];
    outer.forEach((step, k) => {
      if (!step) return;
      const side = k === 0 ? -1 : 1;
      const x = step.dx + side * (step.wide / 2 - 0.3);
      out.push(...balloons(pc, pyaw, x, PODIUM_DY + 0.5, z + step.tall, 3, loop, side));
    });
    out.push(...gifts(pc, pyaw, z), ...spotlights(pc, pyaw, z));
  }

  // The trophy on the top step: a plinth, a stem, a bowl that widens as it rises, a rim, two
  // handles and a star on top.
  if (landed(0.4) > 0) {
    const z = PLAZA_TOP + (STEPS[1]?.tall ?? 1.85) + drop(0.4);
    const cup = (dx: number, dz: number, size: V3, tone = GOLD) =>
      put(dx, PODIUM_DY, z + dz, size, tone, { lit: true, tag: "trophy" });
    out.push(
      cup(0, 0, [1.1, 1.1, 0.24], TONE.ink),
      cup(0, 0.24, [0.8, 0.8, 0.14]),
      cup(0, 0.38, [0.26, 0.26, 0.42]),
      cup(0, 0.8, [0.6, 0.6, 0.22]),
      cup(0, 1.02, [0.82, 0.82, 0.3]),
      cup(0, 1.32, [1.02, 1.02, 0.36]),
      cup(0, 1.68, [1.16, 1.16, 0.1], GOLD_LIGHT),
    );
    for (const side of [-1, 1]) {
      out.push(
        cup(side * 0.68, 1.5, [0.36, 0.18, 0.12]),
        cup(side * 0.82, 1.2, [0.12, 0.18, 0.42]),
        cup(side * 0.68, 1.12, [0.36, 0.18, 0.12]),
      );
    }
    out.push(cup(0, 1.86, [0.3, 0.3, 0.3], toneOf("#ffffff")));
  }

  // Confetti and fireworks once the party has landed.
  if (build >= 1) {
    for (let i = 0; i < 32; i++) {
      const t = (loop + ((i * 37) % 60) / 60) % 1;
      const fx = -SLAB.long / 2 + 0.6 + (((i * 53) % 97) / 97) * (SLAB.long - 1.2);
      const fy = -SLAB.deep / 2 + 0.6 + (((i * 29) % 89) / 89) * (SLAB.deep - 1.2);
      const spin = (i % 2 === 0 ? 1 : -1) * t * Math.PI * 2;
      out.push(
        part(
          pc,
          pyaw + spin * 0.15,
          fx,
          fy,
          6.5 - t * 6.2,
          [0.16, 0.05, 0.12],
          toneOf(PARTY[i % 4] ?? LIT),
          {
            lit: true,
            edge: false,
          },
        ),
      );
    }
    BURSTS.forEach((burst, b) => {
      const t = (loop + b / 3) % 1;
      const centre = placed(pc, pyaw, burst.dx, GATE.dy + 1.2, burst.z);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        out.push({
          kind: "ball",
          c: [
            centre[0] + Math.cos(a) * t * 1.8 * Math.cos(pyaw),
            centre[1] + Math.cos(a) * t * 1.8 * Math.sin(pyaw),
            centre[2] + Math.sin(a) * t * 1.8 - t * t * 0.8,
          ],
          r: 0.1,
          color: burst.colour,
          opacity: 1 - t,
        });
      }
    });
  }
  return out;
};

const BURSTS: { dx: number; z: number; colour: string }[] = [
  { dx: -3.5, z: 9, colour: LIT },
  { dx: 0.5, z: 10.5, colour: "#ffd866" },
  { dx: 3.8, z: 9.5, colour: "#d2f5da" },
];

/** A point `dx` along the plaza's frame and `dy` across it from `c`, `z` above the ground. */
function placed(c: V3, yaw: number, dx: number, dy: number, z: number): V3 {
  return [
    c[0] + dx * Math.cos(yaw) - dy * Math.sin(yaw),
    c[1] + dx * Math.sin(yaw) + dy * Math.cos(yaw),
    c[2] + z,
  ];
}

/**
 * A bunch of `count` balloons tied at one point: each on its own string, leaning out from the
 * knot, a little knot under it, swaying on the 60-frame loop. `side` leans the bunch outward; `reach` scales the strings.
 */
function balloons(
  c: V3,
  yaw: number,
  dx: number,
  dy: number,
  z: number,
  count: number,
  loop: number,
  side: number,
  reach = 1,
): Solid[] {
  const out: Solid[] = [];
  const r = 0.34;
  for (let k = 0; k < count; k++) {
    const long = (1.1 + ((k * 7) % 5) * 0.18) * reach;
    const sway = 0.07 * Math.sin((loop + k / count) * Math.PI * 2);
    const ox = side * (0.12 + (k % 2) * 0.32) + sway;
    const oy = (k - (count - 1) / 2) * 0.34;
    const colour = PARTY[(k + (side > 0 ? 2 : 0)) % PARTY.length] ?? LIT;
    out.push(
      part(c, yaw, dx + ox, dy + oy, z, [0.03, 0.03, long], toneOf("#c9d1d9"), {
        edge: false,
        tag: "balloon-string",
      }),
      part(c, yaw, dx + ox, dy + oy, z + long, [0.1, 0.1, 0.08], toneOf(colour), {
        edge: false,
        tag: "balloon-knot",
      }),
    );
    out.push({ kind: "ball", c: placed(c, yaw, dx + ox, dy + oy, z + long + r), r, color: colour });
  }
  return out;
}

/** Buffers across the rail: a beam on two posts, a lamp on each. */
function buffers(c: V3, yaw: number): Solid[] {
  const out: Solid[] = [];
  for (const dy of [-0.9, 0.9]) {
    out.push(part(c, yaw, 3.4, dy, 0, [0.3, 0.3, 0.9], TONE.dark, { tag: "buffer" }));
    out.push(
      part(c, yaw, 3.4, dy, 0.9, [0.34, 0.34, 0.14], TONE.lamp, {
        lit: true,
        edge: false,
        tag: "buffer",
      }),
    );
  }
  out.push(
    part(c, yaw, 3.4, 0, 0.45, [0.34, 2.4, 0.3], TONE.mid, {
      tag: "buffer",
      decals: [{ on: "back", rect: [0, 0.3, 1, 0.7], fill: "#ffd866" }],
    }),
  );
  return out;
}

/**
 * The plaza's slab, centred on `c`, with a green rim, a lamp on each corner and a paved border.
 * Not tagged "plaza": the town every other plaza gets would stand in the wrong place here, and the
 * avenue already runs behind it.
 */
function slab(c: V3, yaw: number): Solid[] {
  const out: Solid[] = [
    part(c, yaw, 0, 0, 0, [SLAB.long, SLAB.deep, PLAZA_TOP], TONE.plaza, {
      tag: "party-floor",
      under: 3,
      decals: [
        { on: "top", rect: [0.02, 0.04, 0.98, 0.96], fill: "#323b46" },
        { on: "top", rect: [0.06, 0.12, 0.94, 0.88], fill: "#2a323c" },
        { on: "all", rect: [0, 0.7, 1, 1], fill: "#26a641" },
      ],
    }),
  ];
  for (const dx of [-(SLAB.long / 2 - 0.3), SLAB.long / 2 - 0.3]) {
    for (const dy of [-(SLAB.deep / 2 - 0.3), SLAB.deep / 2 - 0.3]) {
      out.push(
        part(c, yaw, dx, dy, PLAZA_TOP, [0.22, 0.22, 0.5], TONE.dark, { tag: "bollard" }),
        part(c, yaw, dx, dy, PLAZA_TOP + 0.5, [0.26, 0.26, 0.12], TONE.lamp, {
          lit: true,
          edge: false,
          tag: "bollard",
        }),
      );
    }
  }
  return out;
}

/** A red carpet with gold edges from a step at the slab's front to the podium. */
function carpet(c: V3, yaw: number): Solid[] {
  const front = -SLAB.deep / 2;
  const foot = PODIUM_DY - STEP_DEEP / 2;
  const edges = [
    {
      on: "top" as const,
      rect: [0, 0, 0.08, 1] as [number, number, number, number],
      fill: "#ffd866",
    },
    {
      on: "top" as const,
      rect: [0.92, 0, 1, 1] as [number, number, number, number],
      fill: "#ffd866",
    },
  ];
  return [
    part(c, yaw, 0, front - 0.45, 0, [1.8, 0.9, 0.12], CARPET, {
      tag: "carpet",
      under: 2,
      decals: edges,
    }),
    part(c, yaw, 0, (front + foot) / 2, PLAZA_TOP, [1.6, foot - front, 0.03], CARPET, {
      tag: "carpet",
      under: 1,
      edge: false,
      decals: edges,
    }),
  ];
}

/** Gifts stacked beside the podium's ends, clear of its words: boxes in the party colours, tied with a ribbon. */
function gifts(c: V3, yaw: number, z: number): Solid[] {
  const stacks: { dx: number; dy: number; size: number; on: number; colour: number }[] = [
    { dx: -6.5, dy: 0.5, size: 0.8, on: 0, colour: 3 },
    { dx: -6.5, dy: 0.5, size: 0.55, on: 0.68, colour: 1 },
    { dx: -6.55, dy: -0.6, size: 0.6, on: 0, colour: 0 },
    { dx: 6.45, dy: 0.5, size: 0.75, on: 0, colour: 1 },
    { dx: 6.5, dy: -0.55, size: 0.55, on: 0, colour: 2 },
  ];
  return stacks.map((g) =>
    part(
      c,
      yaw,
      g.dx,
      g.dy,
      z + g.on,
      [g.size, g.size, g.size * 0.85],
      toneOf(PARTY[g.colour] ?? LIT),
      {
        lit: true,
        tag: "gift",
        decals: [
          { on: "all", rect: [0.42, 0, 0.58, 1], fill: g.colour === 1 ? "#e4572e" : "#ffd866" },
          { on: "top", rect: [0, 0.42, 1, 0.58], fill: g.colour === 1 ? "#e4572e" : "#ffd866" },
        ],
      },
    ),
  );
}

/** Two spotlights at the plaza's sides, their lit lens turned in toward the podium. */
function spotlights(c: V3, yaw: number, z: number): Solid[] {
  const out: Solid[] = [];
  for (const side of [-1, 1]) {
    // Beside the steps' ends and behind them, so from the camera neither ever stands in front
    // of a number: a front corner would.
    const dx = side * (SLAB.long / 2 - 0.6);
    const dy = 2.1;
    out.push(
      part(c, yaw, dx, dy, z, [0.16, 0.16, 0.7], TONE.dark, { edge: false, tag: "spotlight" }),
      part(c, yaw, dx, dy, z + 0.7, [0.6, 0.6, 0.5], TONE.dark, {
        tag: "spotlight",
        decals: [
          { on: side < 0 ? "front" : "back", rect: [0.15, 0.15, 0.85, 0.85], fill: "#fff3c4" },
        ],
      }),
    );
  }
  return out;
}

/**
 * Two strings of flags along the plaza's back, from poles at its back corners to the gate's posts,
 * with a lit bulb between each two flags: behind the podium, so they never cross its numbers.
 */
function bunting(c: V3, yaw: number, z: number, loop: number): Solid[] {
  const out: Solid[] = [];
  const back = SLAB.deep / 2 - 0.4;
  for (const side of [-1, 1]) {
    const pole = { dx: side * (SLAB.long / 2 - 0.4), dy: back };
    const post = { dx: side * GATE.wide * 0.36, dy: GATE.dy };
    out.push(part(c, yaw, pole.dx, pole.dy, z, [0.14, 0.14, 2.8], TONE.dark, { edge: false }));
    const flags = 9;
    for (let k = 1; k < flags; k++) {
      const t = k / flags;
      const sag = 0.55 * Math.sin(t * Math.PI);
      const lineZ = z + 2.8 + (GATE.lift - 2.8) * t - sag;
      const dx = pole.dx + (post.dx - pole.dx) * t;
      const dy = pole.dy + (post.dy - pole.dy) * t;
      out.push(
        part(
          c,
          yaw,
          dx,
          dy,
          lineZ - 0.36,
          [0.3, 0.05, 0.34],
          toneOf(PARTY[k % PARTY.length] ?? LIT),
          {
            lit: true,
            edge: false,
          },
        ),
      );
      // Bulbs between the flags, lit two at a time in a chase on the loop.
      const tb = (k + 0.5) / flags;
      const on = (k + Math.floor(loop * 4)) % 2 === 0;
      out.push(
        part(
          c,
          yaw,
          pole.dx + (post.dx - pole.dx) * tb,
          pole.dy + (post.dy - pole.dy) * tb,
          z + 2.8 + (GATE.lift - 2.8) * tb - 0.55 * Math.sin(tb * Math.PI) - 0.1,
          [0.12, 0.12, 0.12],
          on ? TONE.lamp : toneOf("#6e5a2a"),
          { lit: on, edge: false },
        ),
      );
    }
  }
  return out;
}
