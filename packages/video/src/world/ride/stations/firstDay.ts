import type { RecapData } from "@wyg/schema";
import { firstDayModel } from "../../scenes/firstDay.model";
import { heat, LIT, TONE } from "../palette";
import type { Decal, FaceText, Solid } from "../prims";
import { PLAZA } from "../track";
import { NEAR_ENOUGH, nameBoard, PLAZA_TOP, part, plaza, type Station } from "./kit";

/** Whether the cells are laid right to left on the face toward the rail, so weeks read left to right on screen. */
const FLIP_NEAR = false;

/** The graph on the wall: how many weeks it shows, and the side of one day's cell with its gap. */
const WEEKS = 12;
const CELL = 0.5;
const WALL = { wide: WEEKS * CELL + 0.5, thick: 0.2, tall: 7 * CELL + 0.5, lift: 0.3, at: 1.25 };
/** A day with nothing, the first day with something, and a day the story has not come to yet. */
const EMPTY = "#444c56";
const TO_COME = "#1f2630";
/** The pole of the flag stands at the wall's other end, clear of the first weeks. */
const POLE = -1.6;
/** The flag: wide and tall enough for its date to be a headline from the back of the plaza. */
const FLAG = { wide: 3.2, tall: 2.0 };
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/**
 * The first weeks of the year as GitHub draws them: a column to a week, Sunday at the top. Every
 * day before the first contribution is an empty cell, that day is lit, and the days after it are
 * left dim: the story has not come to them yet, and nothing is said about them here. A year whose
 * first contribution comes late is shown from four weeks before it.
 */
export function firstWeeks(
  data: RecapData,
): { col: number; row: number; state: "empty" | "first" | "to-come" }[] {
  const days = data.contributions.calendar;
  const start = days[0];
  if (!start) return [];
  const offset = new Date(`${start.date}T00:00:00Z`).getUTCDay();
  const first = days.findIndex((day) => day.count > 0);
  const from = first === -1 ? 0 : Math.max(0, Math.floor((first + offset) / 7) - 4);
  const out: { col: number; row: number; state: "empty" | "first" | "to-come" }[] = [];
  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < 7; row++) {
      const index = (from + col) * 7 + row - offset;
      if (index < 0 || index >= days.length) continue;
      out.push({
        col,
        row,
        state: first === -1 || index < first ? "empty" : index === first ? "first" : "to-come",
      });
    }
  }
  return out;
}

/**
 * The first square of the year. Behind the plaza stands the start of the contribution graph as a
 * wall: the days before the first contribution empty, that day lit green as the train comes to
 * rest, the rest still dim. The same square lies large on a plinth in front of it, a flag beside
 * it carries its date and weekday. A
 * year with no contributions has a wall of empty days, an outline where the square would lie, no
 * flag, and a sign that says the graph is blank: there is no date to print.
 */
export const firstDay: Station = (ctx) => {
  const { data, c, yaw, build, stop } = ctx;
  const model = firstDayModel(data);
  const out: Solid[] = plaza(ctx);
  const far = -stop.side * (PLAZA.deep / 2 - 0.45);
  // The wall and its cells. The face toward the rail is the one the camera sees: weeks run left
  // to right on it, so the cells are laid the other way round on the face behind.
  const fine = ctx.overview < NEAR_ENOUGH;
  const lit = build >= 0.85;
  const cells = (face: "left" | "right", mirror: boolean): Decal[] =>
    firstWeeks(data).flatMap((cell): Decal[] => {
      if (!fine && cell.state !== "first") return [];
      const x = 0.25 + cell.col * CELL + 0.04;
      const u0 = x / WALL.wide;
      const u1 = (x + CELL - 0.08) / WALL.wide;
      const top = 0.25 + cell.row * CELL + 0.04;
      const v0 = 1 - (top + CELL - 0.08) / WALL.tall;
      const v1 = 1 - top / WALL.tall;
      const [a0, a1] = mirror ? [1 - u1, 1 - u0] : [u0, u1];
      const day: Decal = {
        on: face,
        rect: [a0, v0, a1, v1],
        fill:
          cell.state === "first" ? (lit ? LIT : EMPTY) : cell.state === "empty" ? EMPTY : TO_COME,
      };
      if (cell.state !== "first" || !lit) return [day];
      // A pale rim round the lit day, so the one square that matters is found at a glance.
      const du = 0.07 / WALL.wide;
      const dv = 0.07 / WALL.tall;
      return [{ on: face, rect: [a0 - du, v0 - dv, a1 + du, v1 + dv], fill: "#aff5b4" }, day];
    });
  if (build > 0) {
    out.push(
      part(c, yaw, WALL.at, far, PLAZA_TOP, [0.16, 0.16, WALL.lift], TONE.dark, {
        tag: "wall-foot",
        edge: false,
      }),
      part(
        c,
        yaw,
        WALL.at,
        far,
        PLAZA_TOP + WALL.lift,
        [WALL.wide, WALL.thick, WALL.tall],
        TONE.ink,
        {
          tag: "graph-wall",
          lit: true,
          decals: [
            { on: "sides", rect: [0, 0, 1, 0.03], fill: LIT },
            ...cells(stop.side === 1 ? "left" : "right", FLIP_NEAR),
            ...cells(stop.side === 1 ? "right" : "left", !FLIP_NEAR),
          ],
        },
      ),
    );
  }

  // The square itself, large, on a plinth in front of the wall.
  out.push(
    part(c, yaw, WALL.at, 0.2 * stop.side, PLAZA_TOP, [2.5, 2.5, 0.14], TONE.dark, {
      tag: "plinth",
      under: 1,
    }),
  );
  if (!model) {
    out.push(
      part(c, yaw, WALL.at, 0.2 * stop.side, PLAZA_TOP + 0.14, [1.9, 1.9, 0.3], TONE.dim, {
        tag: "first-square",
        outline: true,
      }),
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
    part(c, yaw, WALL.at, 0.2 * stop.side, PLAZA_TOP + 0.14, [1.9, 1.9, 0.34], heat(3), {
      tag: "first-square",
      lit: true,
      decals: [{ on: "top", rect: [0.12, 0.12, 0.88, 0.88], fill: "#56e070" }],
    }),
  );

  // The flag goes up its pole over the last half of the build; its words are the model's own.
  const raised = easeOut((build - 0.5) / 0.5);
  out.push(
    part(c, yaw, POLE, 0, PLAZA_TOP, [0.16, 0.16, 4.6], TONE.mid, { tag: "pole", edge: false }),
  );
  if (raised > 0) {
    const texts: FaceText[] = (["left", "right"] as const).flatMap((on): FaceText[] => [
      { on, rect: [0.05, 0.42, 0.95, 0.95], text: model.date, fill: "#ffffff" },
      { on, rect: [0.08, 0.08, 0.92, 0.38], text: model.weekday, fill: "#7ee08f", weight: 700 },
    ]);
    out.push(
      part(
        c,
        yaw,
        POLE - 0.08 - FLAG.wide / 2,
        0,
        PLAZA_TOP + 0.6 + 1.9 * raised,
        [FLAG.wide, 0.1, FLAG.tall],
        TONE.ink,
        {
          tag: "flag",
          lit: true,
          texts,
          decals: [{ on: "sides", rect: [0, 0, 1, 0.05], fill: LIT }],
        },
      ),
    );
  }
  out.push(...nameBoard(ctx, ["First square"], { deep: PLAZA.deep, fit: true }));
  return out;
};
