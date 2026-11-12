import { ARCHETYPE_LABELS } from "../../../copy";
import { formatCount } from "../../../theme";
import { closingModel } from "../../scenes/closing.model";
import { GREENS, LIT, TONE, toneOf } from "../palette";
import type { FaceText, Solid } from "../prims";
import type { V3 } from "../project";
import { at, heading } from "../track";
import { board, PLAZA_TOP, part, type Station } from "./kit";

const GOLD = toneOf("#ffd866");
const GOLD_LIGHT = toneOf("#ffe9a3");
/** Balloons, bunting and confetti: the ride's green, gold, paper and the brand's persimmon. */
const PARTY = [LIT, "#ffd866", "#f4efe3", "#e4572e"] as const;

/** The plaza across the rail from the camera, behind the engine: its middle, along the rail and out from it. */
const AT = { dx: -9, dy: 5.8 } as const;
const SLAB = { long: 14, deep: 7 } as const;
/** The gate at the plaza's back, and the podium in front of it. */
const GATE = { dy: 8.6, wide: 8.4, lift: 2.4 } as const;
const PODIUM_DY = 5.4;
const STEP_DEEP = 1.8;
/** The three steps, along the rail from the plaza's middle: their width and height. */
const STEPS = [
  { dx: -3.95, wide: 4.1, tall: 1.45 },
  { dx: 0, wide: 3.8, tall: 1.85 },
  { dx: 3.75, wide: 3.7, tall: 1.25 },
] as const;
/** The tallest month bar on the gate's crown. */
const BAR_MAX = 1.2;
const DROP = 12;

/**
 * The terminus is a party on a plaza beyond the rail. At its back a gate with balloons up its
 * posts carries the date and the year, crowned by twelve bars as tall as each month's
 * contributions. In front, a podium: the archetype on its top step with a gold trophy, the
 * contributions on the left step, the active days on the right. Bunting runs from the plaza's
 * back corners to the gate, confetti falls and fireworks open over it, all on a 60-frame loop.
 * Everything is lowered in as the train comes in, in turn: gate, podium, trophy.
 */
export const closing: Station = ({ data, stop, c, yaw, frame, build }) => {
  const model = closingModel(data);
  const out: Solid[] = buffers(c, yaw);
  // The plaza is placed on the rail's own line, as every plaza is, so a curve before the
  // terminus turns it with the rail instead of swinging it over the track.
  // It stands on the stop's side, across the rail from the camera. Built facing left of the
  // rail, it is turned half round on the right, so it still reads left to right from the camera.
  const pc = at(stop.s + AT.dx, stop.side * AT.dy);
  const pyaw = heading(stop.s + AT.dx) + (stop.side === 1 ? Math.PI : 0);
  // The slab is ground, there before the party.
  out.push(...slab(pc, pyaw));

  const loop = (((frame % 60) + 60) % 60) / 60;
  const local = (dx: number, dy: number) => [dx, dy] as const;
  const landed = (delay: number) => Math.max(0, Math.min(1, (build - delay) / 0.6));
  const drop = (delay: number) => DROP * (1 - landed(delay)) ** 2;

  // The gate: a banner on two posts, balloons up the posts, the months on its crown.
  if (landed(0.1) > 0) {
    const z = PLAZA_TOP + drop(0.1);
    const [gx, gy] = local(0, GATE.dy - AT.dy);
    const banner = board(
      [pc[0], pc[1], pc[2] + z],
      pyaw,
      gx,
      gy,
      GATE.wide,
      [
        { text: model.date, tall: 0.6, fill: "#c9d1d9", weight: 700 },
        { text: String(model.year), tall: 1.3, fill: LIT },
      ],
      "along",
      GATE.lift,
      "gate",
    );
    out.push(...banner);
    const top = z + GATE.lift + bannerTall();
    const monthly = data.contributions.monthly;
    const most = Math.max(0, ...monthly);
    const bar = (GATE.wide - 0.6) / 12;
    monthly.forEach((count, m) => {
      const share = most > 0 ? count / most : 0;
      out.push(
        part(
          pc,
          pyaw,
          gx - GATE.wide / 2 + 0.3 + bar * (m + 0.5),
          gy,
          top,
          [bar * 0.72, 0.3, 0.2 + BAR_MAX * share],
          toneOf(GREENS[Math.min(3, Math.ceil(share * 3))] ?? LIT),
          { lit: true, tag: "month" },
        ),
      );
    });
    for (const side of [-1, 1]) {
      const px = gx + side * GATE.wide * 0.36;
      for (let k = 0; k < 5; k++) {
        const bob = 0.06 * Math.sin((loop + k / 6) * Math.PI * 2);
        out.push({
          kind: "ball",
          c: placed(pc, pyaw, px, gy + (k % 2 === 0 ? 0.24 : -0.24), z + 0.45 + k * 0.48 + bob),
          r: 0.3,
          color: PARTY[(k + (side > 0 ? 1 : 0)) % PARTY.length] ?? LIT,
        });
      }
    }
  }

  // The podium: the numbers on its long faces, the archetype on the top step.
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
      const [sx, sy] = local(step.dx, PODIUM_DY - AT.dy);
      const texts: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => [
        { on, rect: [0.05, 0.5, 0.95, 0.92], text: big, fill: "#ffffff", weight: 800 },
        { on, rect: [0.02, 0.06, 0.98, 0.48], text: small, fill: "#c9d1d9", weight: 700 },
      ]);
      out.push(
        part(pc, pyaw, sx, sy, z, [step.wide, STEP_DEEP, step.tall], TONE.dark, {
          lit: true,
          tag: "podium",
          texts,
          decals: [{ on: "top", rect: [0, 0, 1, 1], fill: i === 1 ? "#ffd866" : "#3a424d" }],
        }),
      );
    });
  }

  // The trophy on the top step.
  if (landed(0.4) > 0) {
    const [tx, ty] = local(0, PODIUM_DY - AT.dy);
    const z = PLAZA_TOP + (STEPS[1]?.tall ?? 1.5) + drop(0.4);
    const cup = (dx: number, dz: number, size: V3, tone = GOLD) =>
      part(pc, pyaw, tx + dx, ty, z + dz, size, tone, { lit: true, tag: "trophy" });
    // A plinth, a stem, a bowl that widens as it rises, a rim, two handles and a star on top.
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

  if (landed(0.1) > 0) out.push(...bunting(pc, pyaw, PLAZA_TOP + drop(0.1)));

  // Confetti and fireworks once the party has landed.
  if (build >= 1) {
    for (let i = 0; i < 28; i++) {
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
      const centre = placed(pc, pyaw, burst.dx, GATE.dy - AT.dy + 1.2, burst.z);
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

/** The banner's height: the board's two rows and its margins (kit `board`). */
function bannerTall(): number {
  return 0.16 * 2 + 0.6 + 1.3 + 0.12;
}

/** A point `dx` along the rail and `dy` to its left of `c`, `z` above the ground. */
function placed(c: V3, yaw: number, dx: number, dy: number, z: number): V3 {
  return [
    c[0] + dx * Math.cos(yaw) - dy * Math.sin(yaw),
    c[1] + dx * Math.sin(yaw) + dy * Math.cos(yaw),
    c[2] + z,
  ];
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

/** The plaza's slab, centred on `c`, with a green rim and a lamp on each corner, like the other stations'. */
function slab(c: V3, yaw: number): Solid[] {
  const out: Solid[] = [
    part(c, yaw, 0, 0, 0, [SLAB.long, SLAB.deep, PLAZA_TOP], TONE.plaza, {
      tag: "plaza",
      under: 3,
      decals: [
        { on: "top", rect: [0.02, 0.04, 0.98, 0.96], fill: "#323b46" },
        { on: "all", rect: [0, 0.7, 1, 1], fill: "#26a641" },
      ],
    }),
  ];
  for (const dx of [-(SLAB.long / 2 - 0.3), SLAB.long / 2 - 0.3]) {
    for (const dy of [-(SLAB.deep / 2 - 0.3), SLAB.deep / 2 - 0.3]) {
      out.push(
        part(c, yaw, dx, dy, PLAZA_TOP, [0.22, 0.22, 0.5], TONE.dark, {
          tag: "bollard",
        }),
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

/**
 * Two strings of flags along the plaza's back, from poles at its back corners to the gate's posts:
 * behind the podium, so they never cross its numbers.
 */
function bunting(c: V3, yaw: number, z: number): Solid[] {
  const out: Solid[] = [];
  const back = SLAB.deep / 2 - 0.4;
  for (const side of [-1, 1]) {
    const pole = { dx: side * (SLAB.long / 2 - 0.4), dy: back };
    const post = { dx: side * GATE.wide * 0.36, dy: GATE.dy - AT.dy };
    out.push(part(c, yaw, pole.dx, pole.dy, z, [0.14, 0.14, 2.8], TONE.dark, { edge: false }));
    const flags = 9;
    for (let k = 1; k < flags; k++) {
      const t = k / flags;
      const sag = 0.55 * Math.sin(t * Math.PI);
      out.push(
        part(
          c,
          yaw,
          pole.dx + (post.dx - pole.dx) * t,
          pole.dy + (post.dy - pole.dy) * t,
          z + 2.8 + (GATE.lift - 2.8) * t - sag - 0.36,
          [0.3, 0.05, 0.34],
          toneOf(PARTY[k % PARTY.length] ?? LIT),
          { lit: true, edge: false },
        ),
      );
    }
  }
  return out;
}
