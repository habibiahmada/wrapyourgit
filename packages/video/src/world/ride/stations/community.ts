import { countText, skyModel } from "../../scenes/sky.model";
import { TONE, toneOf } from "../palette";
import type { Decal, Solid } from "../prims";
import { PLAZA } from "../track";
import { NEAR_ENOUGH, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

/** Long enough for "about 12.9k" at a size that reads. */
const HALL = { long: 6.4, deep: 2.8, tall: 2.2 };
/** The dome's steps from the hall up: how wide each is and how tall. */
const DOME = [
  { wide: 2.7, tall: 0.42 },
  { wide: 2.45, tall: 0.4 },
  { wide: 2.05, tall: 0.36 },
  { wide: 1.5, tall: 0.3 },
  { wide: 0.85, tall: 0.22 },
];
/** More small stars than this and the sky above the dome stops reading as stars. */
const SKY = 28;
const STONE = toneOf("#4a535e");
const SHELL = toneOf("#8b949e");
const GOLD = toneOf("#ffd866");
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The community: an observatory. Its hall carries the stars, in the model's count; the sign says
 * what they are (this year's gain, or a running total when GitHub gave no gain) and the forks.
 * One small star rises from the dome for each star, up to a sky that still reads; they drift on a
 * 60-frame loop. No stars is said in words: no figure on the hall and no small stars.
 */
export const community: Station = (ctx) => {
  const { data, c, yaw, build, frame } = ctx;
  const fine = ctx.overview < NEAR_ENOUGH;
  const model = skyModel(data);
  const out: Solid[] = plaza(ctx);
  out.push(
    ...nameBoard(
      ctx,
      [
        model.stars.label,
        {
          text: `${countText(model.forks.value, model.forks.estimated)} ${model.forks.label}`,
          tall: 0.4,
        },
      ],
      { deep: PLAZA.deep, fit: true, scale: 1.25 },
    ),
  );
  const landed = easeOut(build / 0.4);
  if (landed <= 0) return out;
  const drop = (1 - landed) * 5;

  // Before the hall has landed the figure rises (never below 1); at rest it is the model's count.
  const rising = Math.max(1, Math.round(model.stars.value * Math.min(1, build) * 0.9));
  const shown =
    build >= 1 ? model.stars.value : Math.min(rising, Math.max(1, model.stars.value - 1));
  let z = PLAZA_TOP;
  out.push(
    part(c, yaw, 0, 0, z + drop, [HALL.long, HALL.deep, HALL.tall], STONE, {
      tag: "observatory",
      lit: true,
      decals: [
        { on: "all", rect: [0, 0, 1, 0.07], fill: "#2a3038" },
        { on: "all", rect: [0, 0.92, 1, 1], fill: "#ffd866" },
        // On its two ends, where no figure is: a door under a round window, and a lit pane each side.
        ...(fine
          ? ([
              { on: "front", rect: [0.38, 0.07, 0.62, 0.52], fill: "#0d1117" },
              { on: "front", rect: [0.4, 0.6, 0.6, 0.84], fill: "#79c0ff", round: true },
              { on: "front", rect: [0.1, 0.3, 0.26, 0.62], fill: "#ffd866" },
              { on: "front", rect: [0.74, 0.3, 0.9, 0.62], fill: "#ffd866" },
              { on: "back", rect: [0.38, 0.07, 0.62, 0.52], fill: "#0d1117" },
              { on: "back", rect: [0.4, 0.6, 0.6, 0.84], fill: "#79c0ff", round: true },
              { on: "back", rect: [0.1, 0.3, 0.26, 0.62], fill: "#ffd866" },
              { on: "back", rect: [0.74, 0.3, 0.9, 0.62], fill: "#ffd866" },
            ] satisfies Decal[])
          : []),
      ],
      texts:
        model.stars.value > 0
          ? [
              {
                on: "sides",
                rect: [0.05, 0.14, 0.95, 0.86],
                text: countText(shown, model.stars.estimated),
                fill: "#ffffff",
              },
            ]
          : [],
    }),
  );
  z += HALL.tall;
  for (const step of DOME) {
    out.push(
      part(c, yaw, 0, 0, z + drop, [step.wide, step.wide, step.tall], SHELL, {
        tag: "dome",
        lit: true,
        // The slit the telescope looks through runs up every step, and over the top.
        decals: fine
          ? [
              { on: "sides", rect: [0.42, 0, 0.58, 1], fill: "#0d1117" },
              { on: "top", rect: [0, 0.42, 1, 0.58], fill: "#0d1117" },
            ]
          : [],
      }),
    );
    z += step.tall;
  }
  // A telescope on its stand beside the hall, turned to the sky over the dome.
  out.push(
    part(c, yaw, HALL.long / 2 + 1.0, 0, PLAZA_TOP + drop, [0.12, 0.12, 0.9], TONE.mid, {
      tag: "telescope",
      edge: false,
    }),
    part(
      c,
      yaw + 0.5,
      HALL.long / 2 + 1.0,
      0,
      PLAZA_TOP + 0.9 + drop,
      [1.1, 0.3, 0.3],
      toneOf("#e6edf3"),
      {
        tag: "telescope",
        lit: true,
        decals: fine
          ? [
              { on: "front", rect: [0.15, 0.15, 0.85, 0.85], fill: "#79c0ff", round: true },
              { on: "sides", rect: [0.7, 0, 0.78, 1], fill: "#ffd866" },
            ]
          : [],
      },
    ),
  );

  // The small stars: out of the dome over the second half of the build.
  const up = easeOut((build - 0.5) / 0.5);
  if (up <= 0) return out;
  const count = Math.min(model.drawn, SKY);
  const loop = (((frame % 60) + 60) % 60) / 60;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.4;
    const reach = 0.5 + (i % 5) * 0.42;
    const drift = Math.sin((loop + i / 7) * Math.PI * 2) * 0.08;
    out.push(
      part(
        c,
        yaw,
        Math.cos(angle) * reach,
        Math.sin(angle) * reach * 0.6,
        z + (0.5 + ((i * 7) % count) * (1.8 / count) + drift) * up,
        [0.22, 0.22, 0.22],
        i % 4 === 0 ? toneOf("#ffffff") : GOLD,
        {
          tag: "star",
          lit: true,
          edge: false,
          // A bright heart on every face: a star that glints, not a cube.
          decals: fine
            ? [{ on: "all", rect: [0.28, 0.28, 0.72, 0.72], fill: "#ffffff", round: true }]
            : [],
        },
      ),
    );
  }
  return out;
};
