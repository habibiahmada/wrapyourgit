import { helloModel } from "../../scenes/hello.model";
import { SHOTS } from "../camera";
import type { V3 } from "../project";
import { board, type Station, wrap } from "./kit";

/** A login has no spaces to break at. Past this many letters it goes onto another row, after a hyphen when one is near. */
const ROW = 20;

function rows(login: string): string[] {
  const out: string[] = [];
  let rest = login;
  while (rest.length > ROW) {
    const hyphen = rest.lastIndexOf("-", ROW - 1);
    const cut = hyphen >= ROW - 5 ? hyphen + 1 : ROW;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return [...out, rest];
}

/**
 * A board `dx` along and `dy` across from the train, turned square to the hello shot's camera.
 * That camera is close with a wide lens: a board seen at a slant from there has edges that run
 * at different slopes, and no flat line of text can follow them all.
 */
function facing(c: V3, yaw: number, dx: number, dy: number): { c: V3; yaw: number } {
  const { theta, radius } = SHOTS.HELLO;
  const turn = Math.atan2(Math.sin(theta) * radius - dy, Math.cos(theta) * radius - dx);
  return {
    c: [
      c[0] + dx * Math.cos(yaw) - dy * Math.sin(yaw),
      c[1] + dx * Math.sin(yaw) + dy * Math.cos(yaw),
      c[2],
    ],
    yaw: yaw + turn,
  };
}

/**
 * The first platform: a board behind the train with whose year this is.
 */
export const hello: Station = ({ data, c, yaw }) => {
  const model = helloModel(data);
  const login = rows(`@${model.login}`);
  // A recap built from public data only says so on the same board: a second board beside the
  // rail stood outside this shot's frame.
  const scope = wrap(model.scopeLine ?? "", ROW).map((text) => ({
    text,
    tall: 0.44,
    fill: "#7ee08f",
    weight: 700,
  }));
  const main = facing(c, yaw, -3.6, -2.6);
  // Rows past the usual two are set a little smaller and the board hangs lower, so its top stays in frame.
  const extra = login.length - 1 + scope.length;
  return board(
    main.c,
    main.yaw,
    0,
    0,
    4.8,
    [
      String(model.year),
      ...(login.length > 1 ? login.map((text) => ({ text, tall: 0.44 })) : login),
      ...scope,
    ],
    "across",
    1.5 - 0.2 * extra,
  );
};
