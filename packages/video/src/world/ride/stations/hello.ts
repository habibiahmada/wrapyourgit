import { helloModel } from "../../scenes/hello.model";
import { board, type Station } from "./kit";

/**
 * The first platform: a board behind the train with whose year this is. A recap built from public
 * data only says so on a second board.
 */
export const hello: Station = ({ data, c, yaw }) => {
  const model = helloModel(data);
  return [
    ...board(c, yaw, -3.6, -2.6, 4.2, [String(model.year), `@${model.login}`]),
    ...(model.scopeLine
      ? board(c, yaw, -3.6, 3.2, 5.4, [{ text: model.scopeLine, tall: 0.5 }])
      : []),
  ];
};
