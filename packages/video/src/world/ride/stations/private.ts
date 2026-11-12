import { formatCount } from "../../../theme";
import { privateModel } from "../../scenes/private.model";
import { TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { belt, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

const IRON = toneOf("#3b424c");
const BRASS = "#c9a24b";
const LONG = 5.2;
const DEEP = 2.6;
const TALL = 3.4;
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * Private work: a locked vault. Its side carries the count and nothing else; no repository is
 * named anywhere on this station. The vault is lowered on as the train comes in and the figure
 * rises with it, exact when the train stops. A year with nothing private has the vault standing
 * open and empty; a count GitHub would not give has it shut with no figure at all, which is not
 * the same as zero. The sign says which, in the model's words.
 */
export const privateVault: Station = (ctx) => {
  const { data, c, yaw, build } = ctx;
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
  ];
  // Private work rides into the vault on the conveyor: closed boxes, each with its lock. Only when
  // there is a count to stand for; a vault with nothing in it, or one nobody could read, gets none.
  if (model.kind === "count") out.push(...belt(ctx, 7, IRON, "#e3b341"));
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
  out.push(
    part(c, yaw, 0, 0, PLAZA_TOP, [LONG + 0.5, DEEP + 0.5, 0.25], TONE.dark, {
      tag: "base",
      under: 1,
    }),
  );
  out.push(
    part(c, yaw, 0, 0, PLAZA_TOP + 0.25 + (1 - landed) * 5, [LONG, DEEP, TALL], IRON, {
      tag: "vault",
      lit: true,
      decals,
      texts,
    }),
  );
  return out;
};
