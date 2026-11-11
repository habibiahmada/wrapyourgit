import { firstDayModel } from "../../scenes/firstDay.model";
import { heat, LIT, TONE } from "../palette";
import type { FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

const BED = 0.3;
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The first square of the year: one large day square on a bed of soil with a sprout growing from
 * it, and a flag beside it carrying its date and weekday. The sprout grows on the way in and
 * sways a little at rest. A year with no contributions has an empty outline where the square
 * would be, no flag, and a sign that says the graph is blank: there is no date to print.
 */
export const firstDay: Station = (ctx) => {
  const { data, c, yaw, build, frame } = ctx;
  const model = firstDayModel(data);
  const out: Solid[] = plaza(ctx);
  const top = PLAZA_TOP + BED;
  out.push(part(c, yaw, -1.6, 0, PLAZA_TOP, [4.2, 3.4, BED], TONE.soil, { tag: "bed", under: 1 }));

  if (!model) {
    out.push(
      part(c, yaw, -1.6, 0, top, [2.2, 2.2, 0.3], TONE.dim, { tag: "first-square", outline: true }),
    );
    out.push(
      ...nameBoard(ctx, ["A blank graph: no contributions this year"], {
        deep: PLAZA.deep,
        fit: true,
      }),
    );
    return out;
  }

  out.push(
    part(c, yaw, -1.6, 0, top, [2.2, 2.2, 0.35], heat(3), {
      tag: "first-square",
      lit: true,
      decals: [{ on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: "#56e070" }],
    }),
  );
  // The sprout: a stem, a leaf to each side, a bud on top. It sways on a 60-frame loop.
  const grown = easeOut(build);
  const stem = 2.4 * grown;
  const sway = Math.sin((frame / 60) * Math.PI * 2) * 0.07 * grown;
  const from = top + 0.35;
  if (stem > 0.05) {
    const sprout = { tag: "sprout", lit: true };
    out.push(part(c, yaw, -1.6, 0, from, [0.2, 0.2, stem], TONE.cellDark, sprout));
    out.push(
      part(c, yaw, -1.6 + 0.5 + sway, 0, from + stem * 0.45, [0.9, 0.4, 0.14], TONE.cell, sprout),
    );
    out.push(
      part(c, yaw, -1.6 - 0.5 + sway, 0, from + stem * 0.7, [0.9, 0.4, 0.14], TONE.cell, sprout),
    );
    out.push(part(c, yaw, -1.6 + sway, 0, from + stem, [0.44, 0.44, 0.36], heat(3), sprout));
  }
  // The flag goes up its pole over the last half of the build; its words are the model's own.
  const raised = easeOut((build - 0.5) / 0.5);
  out.push(
    part(c, yaw, 1.3, 0, PLAZA_TOP, [0.16, 0.16, 4.3], TONE.mid, { tag: "pole", edge: false }),
  );
  if (raised > 0) {
    const texts: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => [
      { on, rect: [0.05, 0.42, 0.95, 0.95], text: model.date, fill: "#ffffff" },
      { on, rect: [0.08, 0.08, 0.92, 0.38], text: model.weekday, fill: "#7ee08f", weight: 700 },
    ]);
    out.push(
      part(c, yaw, 1.3 + 0.08 + 1.5, 0, PLAZA_TOP + 0.6 + 1.9 * raised, [3.0, 0.1, 1.7], TONE.ink, {
        tag: "flag",
        lit: true,
        texts,
        decals: [{ on: "sides", rect: [0, 0, 1, 0.05], fill: LIT }],
      }),
    );
  }
  out.push(...nameBoard(ctx, ["First square"], { deep: PLAZA.deep, fit: true }));
  return out;
};
