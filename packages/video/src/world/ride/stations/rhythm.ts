import { formatCount } from "../../../theme";
import { rhythmModel } from "../../scenes/rhythm.model";
import { GREENS, LIT, TONE, toneOf } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { NEAR_ENOUGH, nameBoard, PLAZA_TOP, part, plaza, type Station, trackPaint } from "./kit";

/** A wagon: how long it stands on the siding, and its body. */
const PITCH = 2.15;
const BODY = { long: 1.9, deep: 1.5, tall: 1.25 };
/** The tallest load. Lower where the wagons stand in two rows, so the front row's loads leave the back row's counts in view. */
const LOAD = { landscape: 1.6, portrait: 1.1, compact: 1.1 };
/** How high the back row's siding is lifted when the wagons stand in two rows. */
const TIER = 2.2;
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The week's rhythm: a siding with seven wagons, Sunday to Saturday. Each wagon's side carries
 * its day and its count, and its load is as tall as that weekday's share of the busiest one,
 * which is the bright one. A weekday with nothing carries nothing: an empty wagon, and a true 0.
 * The wagons are lowered on one after another as the train comes in, and the counts rise with
 * them. A wide frame keeps them in one row; a narrow one stands four on a siding behind and
 * three in front.
 */
export const rhythm: Station = (ctx) => {
  const { data, c, yaw, build, stop, layout } = ctx;
  const model = rhythmModel(data);
  const row = layout === "landscape";
  const long = (row ? 7 : 4) * PITCH + 0.9;
  const deep = row ? 4.8 : 6.6;
  const out: Solid[] = plaza(ctx, long, deep);
  out.push(
    ...nameBoard(
      ctx,
      // The title alone when the wagons say the rest; the model's caption when they are all empty.
      model.busiest ? [model.title] : [model.title, model.caption],
      { deep, fit: true },
    ),
  );

  const fine = ctx.overview < NEAR_ENOUGH;
  // The siding itself: a length of track under each row of wagons.
  for (const [count, dy, floor] of row
    ? ([[7, 0, PLAZA_TOP]] as const)
    : ([
        [4, -stop.side * 1.5, PLAZA_TOP + TIER],
        [3, stop.side * 1.3, PLAZA_TOP],
      ] as const)) {
    const reach = count * PITCH + 0.3;
    out.push(
      part(c, yaw, 0, dy, floor, [reach, 1.3, 0.05], toneOf("#3a424d"), {
        tag: "siding",
        under: 1,
        edge: false,
        decals: fine ? trackPaint(reach) : [],
      }),
    );
  }

  model.cars.forEach((car, i) => {
    const back = row || i < 4;
    const inRow = row ? 7 : back ? 4 : 3;
    const k = row || back ? i : i - 4;
    const dx = (k - (inRow - 1) / 2) * PITCH;
    const dy = row ? 0 : back ? -stop.side * 1.5 : stop.side * 1.3;
    const floor = PLAZA_TOP + (!row && back ? TIER : 0);
    const landed = easeOut((build - i * 0.07) / 0.35);
    if (landed <= 0) return;
    const drop = (1 - landed) * 5;
    for (const wheel of [-0.55, 0.55]) {
      out.push(
        part(c, yaw, dx + wheel, dy, floor + drop, [0.42, BODY.deep + 0.1, 0.42], TONE.ink, {
          tag: "wheel",
          decals: [{ on: "sides", rect: [0.25, 0.25, 0.75, 0.75], fill: "#8b949e", round: true }],
        }),
      );
    }
    // Before a wagon has landed its count rises (never below 1 for a day that has some); at rest it is exact.
    const rising = Math.max(1, Math.round(car.count * Math.min(1, build) * 0.9));
    const shown =
      build >= 1 || car.count === 0 ? car.count : Math.min(rising, Math.max(1, car.count - 1));
    const texts: FaceText[] = [
      { on: "sides", rect: [0.04, 0.52, 0.96, 0.94], text: car.day, fill: "#c9d1d9", weight: 700 },
      { on: "sides", rect: [0.04, 0.08, 0.96, 0.5], text: formatCount(shown), fill: "#ffffff" },
    ];
    out.push(
      part(c, yaw, dx, dy, floor + 0.3 + drop, [BODY.long, BODY.deep, BODY.tall], TONE.dark, {
        tag: "wagon",
        lit: true,
        texts,
        decals: [
          { on: "all", rect: [0, 0.94, 1, 1], fill: car.busiest ? LIT : "#545d68" },
          // A wagon's make: its frame along the foot, a rib at each end, a lamp at each corner.
          ...(fine
            ? ([
                { on: "all", rect: [0, 0, 1, 0.05], fill: "#161b22" },
                { on: "sides", rect: [0.01, 0.05, 0.03, 0.94], fill: "#545d68" },
                { on: "sides", rect: [0.97, 0.05, 0.99, 0.94], fill: "#545d68" },
                { on: "front", rect: [0.08, 0.1, 0.2, 0.22], fill: "#ffd866", round: true },
                { on: "front", rect: [0.8, 0.1, 0.92, 0.22], fill: "#ffd866", round: true },
                { on: "back", rect: [0.08, 0.1, 0.2, 0.22], fill: "#da3633", round: true },
                { on: "back", rect: [0.8, 0.1, 0.92, 0.22], fill: "#da3633", round: true },
              ] satisfies Decal[])
            : []),
        ],
      }),
    );
    // The coupling to the next wagon of its row: a little short of both, so it touches neither.
    if (landed >= 1 && k < inRow - 1) {
      out.push(
        part(
          c,
          yaw,
          dx + PITCH / 2,
          dy,
          floor + 0.55,
          [PITCH - BODY.long - 0.04, 0.16, 0.1],
          TONE.ink,
          {
            tag: "coupling",
            edge: false,
          },
        ),
      );
    }
    if (car.fill > 0) {
      out.push(
        part(
          c,
          yaw,
          dx,
          dy,
          floor + 0.3 + BODY.tall + drop,
          [BODY.long - 0.3, BODY.deep - 0.3, LOAD[layout] * car.fill * landed],
          toneOf(car.busiest ? LIT : (GREENS[1] ?? LIT)),
          {
            tag: "cargo",
            lit: car.busiest,
            // Strapped down: two bands over the load, and a lighter panel on its top.
            decals: fine
              ? [
                  { on: "all", rect: [0.26, 0, 0.32, 1], fill: "#0e4429" },
                  { on: "all", rect: [0.68, 0, 0.74, 1], fill: "#0e4429" },
                  {
                    on: "top",
                    rect: [0.08, 0.1, 0.92, 0.9],
                    fill: car.busiest ? "#56e070" : "#26a641",
                  },
                ]
              : [],
          },
        ),
      );
    }
  });

  if (!row) {
    out.push(
      part(c, yaw, 0, -stop.side * 1.5, PLAZA_TOP, [4 * PITCH + 0.5, 2.1, TIER], TONE.dark, {
        tag: "tier",
        under: 2,
        decals: [{ on: "all", rect: [0, 0.94, 1, 1], fill: "#8b949e" }],
      }),
    );
  }
  return out;
};
