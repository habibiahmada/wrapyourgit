import { closingModel } from "../../scenes/closing.model";
import { LIT, TONE } from "../palette";
import type { Solid } from "../prims";
import { board, part, type Station } from "./kit";

const BURSTS: { dx: number; dy: number; z: number; colour: string }[] = [
  { dx: 6.5, dy: -3.2, z: 7.5, colour: LIT },
  { dx: 7.5, dy: 2.6, z: 9, colour: "#ffd866" },
  { dx: 5.5, dy: 0.4, z: 10.5, colour: "#d2f5da" },
];

/**
 * The terminus: buffers at the end of the rail, a large board with the year's headline numbers,
 * and fireworks of small cubes that loop every 60 frames.
 */
export const closing: Station = ({ data, c, yaw, frame, build }) => {
  const model = closingModel(data);
  const out: Solid[] = [];
  // Buffers across the rail: a beam on two posts, a lamp on each.
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
  // The board goes up as the train comes in: from the station before, the terminus is bare.
  const rise = 1 - (1 - Math.max(0, Math.min(1, build))) ** 3;
  if (rise <= 0) return out;
  out.push(
    ...board(
      c,
      yaw,
      5.6,
      0,
      7.5,
      [
        { text: model.date, tall: 0.5, fill: "#c9d1d9", weight: 700 },
        { text: String(model.year), tall: 1.4, fill: LIT },
        ...model.lines.map((text) => ({ text, tall: 0.6 })),
      ],
      "across",
      1.2 * rise,
    ),
  );
  // Fireworks: three bursts, each opening and fading in turn, on a 60-frame loop.
  const loop = (((frame % 60) + 60) % 60) / 60;
  BURSTS.forEach((burst, b) => {
    const t = (loop + b / 3) % 1;
    const cx = c[0] + burst.dx * Math.cos(yaw) - burst.dy * Math.sin(yaw);
    const cy = c[1] + burst.dx * Math.sin(yaw) + burst.dy * Math.cos(yaw);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      out.push({
        kind: "ball",
        c: [
          cx + Math.cos(a) * t * 1.8 * Math.cos(yaw + 1),
          cy + Math.cos(a) * t * 1.8 * Math.sin(yaw + 1),
          burst.z + Math.sin(a) * t * 1.8 - t * t * 0.8,
        ],
        r: 0.1,
        color: burst.colour,
        opacity: 1 - t,
      });
    }
  });
  return out;
};
