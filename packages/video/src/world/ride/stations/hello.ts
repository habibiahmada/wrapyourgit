import { helloModel } from "../../scenes/hello.model";
import { board, type Station } from "./kit";

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
 * The first platform: a board behind the train with whose year this is. A recap built from public
 * data only says so on a second board.
 */
export const hello: Station = ({ data, c, yaw }) => {
  const model = helloModel(data);
  const login = rows(`@${model.login}`);
  return [
    // A login on several rows is set a little smaller and the board hangs lower, so its top stays in frame.
    ...board(
      c,
      yaw,
      -3.6,
      -2.6,
      4.8,
      [
        String(model.year),
        ...(login.length > 1 ? login.map((text) => ({ text, tall: 0.44 })) : login),
      ],
      "across",
      1.5 - 0.2 * (login.length - 1),
    ),
    ...(model.scopeLine
      ? board(c, yaw, -3.6, 3.2, 5.4, [{ text: model.scopeLine, tall: 0.5 }])
      : []),
  ];
};
