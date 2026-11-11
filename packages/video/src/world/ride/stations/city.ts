import { formatCount } from "../../../theme";
import { cityModel } from "../../scenes/city.model";
import { BILLBOARD, billboardAt, FIRST_PLATFORM, railEnd } from "../track";
import { board, type Station, wrap } from "./kit";

/** How tall a row of the billboard's words is. */
const ROW = 3.8;

/**
 * The overview has no plaza: one very large billboard beside the middle of the rail carries the
 * year's total, sized to read from high above and turned square to the overview camera. It stands only
 * while the camera is up there. A line too long for a row takes two.
 */
export const city: Station = ({ data, city: year, overview, layout }) => {
  // It is lowered in over the second half of the climb and has landed when the camera settles;
  // on the way down it is lifted away first. Put there all at once, a board this size would
  // jump into the frame while the camera is still near the train.
  const landed = 1 - (1 - Math.max(0, Math.min(1, (overview - 0.45) / 0.55))) ** 3;
  if (landed <= 0) return [];
  const model = cityModel(data);
  const weeks = Math.max(...year.plots.map((plot) => plot.col)) + 1;
  const middle = (FIRST_PLATFORM + railEnd(weeks)) / 2;
  const max = Math.floor((BILLBOARD.wide * 0.9) / (0.6 * ROW * 0.92));
  const small = (text: string, fill: string) =>
    wrap(text, max).map((piece) => ({ text: piece, tall: ROW, fill, weight: 700 }));
  const place = billboardAt(middle, layout);
  return board(
    [place.c[0], place.c[1], (1 - landed) * 45],
    place.yaw,
    0,
    0,
    BILLBOARD.wide,
    [
      ...small(model.headline, "#c9d1d9"),
      { text: formatCount(model.total), tall: 9 },
      ...small("contributions", "#c9d1d9"),
      ...small(model.legend ?? "", "#7ee08f"),
    ],
    "along",
    3,
  );
};
