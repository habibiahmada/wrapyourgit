import { formatCount } from "../../../theme";
import { cityModel } from "../../scenes/city.model";
import { at, FIRST_PLATFORM, railEnd } from "../track";
import { board, type Station } from "./kit";

/** What the ride's ground is made of. The model's own caption speaks of buildings, from the city it was written for. */
const CAPTION = "contributions · one square per day";

/**
 * The overview has no plaza: one very large billboard beside the middle of the rail carries the
 * year's total, sized to read from high above. It stands only while the camera is up there.
 */
export const city: Station = ({ data, city: year, overview }) => {
  if (overview <= 0) return [];
  const model = cityModel(data);
  const weeks = Math.max(...year.plots.map((plot) => plot.col)) + 1;
  const middle = (FIRST_PLATFORM + railEnd(weeks)) / 2;
  return board(
    at(middle, 17),
    0,
    0,
    0,
    34,
    [
      { text: model.headline, tall: 2.6, fill: "#c9d1d9", weight: 700 },
      { text: formatCount(model.total), tall: 9 },
      { text: CAPTION, tall: 2.2, fill: "#c9d1d9", weight: 700 },
      { text: model.legend ?? "", tall: 1.8, fill: "#7ee08f", weight: 700 },
    ],
    "along",
    3 * overview,
  );
};
