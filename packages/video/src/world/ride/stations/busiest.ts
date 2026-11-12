import { formatCount } from "../../../theme";
import { busiestModel } from "../../scenes/busiest.model";
import { LIT, TONE, toneOf } from "../palette";
import type { Decal, Solid } from "../prims";
import { PLAZA } from "../track";
import { belt, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

const BASE = { long: 5.2, deep: 2.6, tall: 2.1 };
/** Where the tower and the calendar stand on the base, along the rail from its middle. */
const TOWER_AT = -1.45;
const PAGE_AT = 1.3;
/** The tower's tiers from the base up: how wide and how tall each is, and its green. */
const TIERS = [
  { wide: 1.7, tall: 1.9, tone: toneOf("#238636") },
  { wide: 1.35, tall: 1.3, tone: toneOf("#2ea043") },
  { wide: 1.0, tall: 0.8, tone: toneOf("#3fb950") },
];
/** A storey of the tower: how tall, and how tall its band of glass is. */
const STOREY = 0.42;
const GLASS = 0.22;
/** The calendar's page: how wide, how thick and how tall, and how much of it the month's band takes. */
const PAGE = { wide: 2.3, thick: 0.5, tall: 2.5, band: 0.28 };
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/** The windows of one tier: a dark band to each storey, and the panes that are lit, the same every frame. */
function windows(tier: number, wide: number, tall: number): Decal[] {
  const decals: Decal[] = [];
  const cols = Math.max(2, Math.round(wide / 0.42));
  for (let floor = 0; 0.14 + floor * STOREY + GLASS < tall - 0.08; floor++) {
    const v0 = (0.14 + floor * STOREY) / tall;
    const v1 = (0.14 + floor * STOREY + GLASS) / tall;
    decals.push({ on: "all", rect: [0.08, v0, 0.92, v1], fill: "#0b2e17" });
    for (let k = 0; k < cols; k++) {
      // Lit by the pane's place, never by chance: the same tower on every frame.
      if ((tier * 5 + floor * 3 + k * 4) % 7 > 3) continue;
      const u0 = 0.1 + (k * 0.8) / cols;
      decals.push({
        on: "all",
        rect: [u0 + 0.02, v0, u0 + 0.8 / cols - 0.02, v1],
        fill: (tier + floor + k) % 4 === 0 ? "#ffd866" : "#d2f5da",
      });
    }
  }
  decals.push({ on: "top", rect: [0.1, 0.1, 0.9, 0.9], fill: "#0e4429" });
  return decals;
}

/**
 * The busiest day: the tallest tower of the year beside the page of the calendar it happened on.
 * The stone base carries the day's count. On it, as the train comes in, a green tower goes up
 * tier by tier, the brightest green of the graph with its windows lit, and a calendar page lands
 * beside it: the month on its red band, the day large under it. Last, a gold plate marked "#1"
 * is set on the tower's top, and turns once every 60 frames. The sign carries which day it was.
 * A year with no busiest day has no such stop; without one this draws the bare plaza.
 */
export const busiest: Station = (ctx) => {
  const { data, c, yaw, build, frame } = ctx;
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
  out.push(
    part(c, yaw, 0, 0, PLAZA_TOP + (1 - down) * 5, [BASE.long, BASE.deep, BASE.tall], TONE.dark, {
      tag: "record-base",
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
  // That day's contributions ride past on the conveyor: one load for each, up to ten.
  out.push(...belt(ctx, Math.min(10, model.count), toneOf("#2ea043"), LIT));
  const top = PLAZA_TOP + BASE.tall;
  /** How far piece `k` has come down: each is lowered on after the one before it. */
  const landed = (k: number) => easeOut((build - 0.25 - k * 0.12) / 0.2);

  // The tower, tier on tier.
  let z = top;
  TIERS.forEach((tier, k) => {
    const on = landed(k);
    if (on > 0) {
      out.push(
        part(c, yaw, TOWER_AT, 0, z + (1 - on) * 5, [tier.wide, tier.wide, tier.tall], tier.tone, {
          tag: "record-tower",
          lit: true,
          decals: windows(k, tier.wide, tier.tall),
        }),
      );
    }
    z += tier.tall;
  });

  // The calendar's page on its foot: the month on a red band with two ring holes, the day under it.
  const page = landed(3);
  if (page > 0) {
    const [month = "", day = ""] = model.date.split(" ");
    const lift = (1 - page) * 5;
    const hole = (u: number): Decal => ({
      on: "sides",
      rect: [u, 1 - PAGE.band * 0.62, u + 0.2 / PAGE.wide, 1 - PAGE.band * 0.62 + 0.2 / PAGE.tall],
      fill: "#0d1117",
      round: true,
    });
    out.push(
      part(c, yaw, PAGE_AT, 0, top + lift, [PAGE.wide + 0.3, 1.0, 0.18], TONE.mid, {
        tag: "calendar",
        lit: true,
      }),
      part(
        c,
        yaw,
        PAGE_AT,
        0,
        top + 0.18 + lift,
        [PAGE.wide, PAGE.thick, PAGE.tall],
        toneOf("#e6edf3"),
        {
          tag: "calendar",
          lit: true,
          decals: [
            { on: "all", rect: [0, 1 - PAGE.band, 1, 1], fill: "#da3633" },
            { on: "top", rect: [0, 0, 1, 1], fill: "#b62324" },
            hole(0.1),
            hole(0.9 - 0.2 / PAGE.wide),
          ],
          texts: [
            {
              on: "sides",
              rect: [0.24, 1 - PAGE.band + 0.02, 0.76, 0.985],
              text: month.toUpperCase(),
              fill: "#ffffff",
              weight: 800,
            },
            {
              on: "sides",
              rect: [0.1, 0.05, 0.9, 1 - PAGE.band - 0.03],
              text: day,
              fill: "#0d1117",
              weight: 800,
            },
          ],
        },
      ),
    );
  }

  // The plate on the tower's top: one turn every 60 frames, so a rest loop ends where it began.
  const plate = landed(4);
  if (plate > 0) {
    const turn = (((frame % 60) + 60) % 60) / 60;
    const lift = (1 - plate) * 5;
    out.push(
      part(c, yaw, TOWER_AT, 0, z + lift, [0.12, 0.12, 0.3], TONE.dark, {
        tag: "record-tower",
        edge: false,
      }),
    );
    // Its own pivot: it turns about the tower's middle, not the plaza's.
    const post = part(c, yaw, TOWER_AT, 0, z + 0.3 + lift, [0.95, 0.16, 0.95], TONE.lamp, {
      tag: "medal",
      lit: true,
      decals: [{ on: "sides", rect: [0.08, 0.08, 0.92, 0.92], fill: "#e3b341" }],
      texts: [
        { on: "sides", rect: [0.14, 0.2, 0.86, 0.8], text: "#1", fill: "#0d1117", weight: 800 },
      ],
    });
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const mid: [number, number] = [c[0] + TOWER_AT * cos, c[1] + TOWER_AT * sin];
    out.push({
      ...post,
      at: [mid[0] - post.size[0] / 2, mid[1] - post.size[1] / 2, post.at[2]],
      pivot: mid,
      yaw: yaw + turn * Math.PI * 2,
    });
  }
  return out;
};
