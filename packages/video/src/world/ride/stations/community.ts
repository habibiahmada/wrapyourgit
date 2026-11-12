import { countText, skyModel } from "../../scenes/sky.model";
import { TONE, toneOf } from "../palette";
import type { Solid } from "../prims";
import { PLAZA } from "../track";
import { nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

/** Long enough for "about 12.9k" at a size that reads. */
const HALL = { long: 6.4, deep: 2.8, tall: 2.2 };
/** The dome's steps from the hall up: how wide each is and how tall. */
const DOME = [
  { wide: 2.6, tall: 0.55 },
  { wide: 2.0, tall: 0.5 },
  { wide: 1.3, tall: 0.4 },
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
      }),
    );
    z += step.tall;
  }
  // The hatch the telescope looks through.
  out.push(part(c, yaw, 0, 0, z + drop, [0.36, 1.5, 0.12], TONE.ink, { tag: "dome", edge: false }));

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
        { tag: "star", lit: true, edge: false },
      ),
    );
  }
  return out;
};
