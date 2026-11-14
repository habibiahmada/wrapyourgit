/*
 * Spike only (issue #147, never merged): what the export benchmark page needs to draw the ride
 * outside Remotion, in a worker, the way RideStory and RideCanvas draw it.
 */
import type { RecapData } from "@wyg/schema";
import { staticFile } from "remotion";
import { languageIcon } from "../../languages";
import { fontFamily } from "../../theme";
import { gardenModel } from "../scenes/garden.model";
import { backdrop } from "./backdrop";
import { buildRide, rideFrame } from "./model";
import { paintPrims } from "./paint";
import { SKY } from "./palette";
import { scenePrims } from "./prims";
import { archetypeFigures } from "./stations/archetype";

export { backdrop, buildRide, fontFamily, paintPrims, rideFrame, SKY, scenePrims };

/** Every picture the ride draws, as RideStory lists them (the prims name them by these hrefs). */
export function rideLogos(data: RecapData): string[] {
  return [
    ...gardenModel(data)
      .trees.map((tree) => languageIcon(tree.name))
      .filter((icon): icon is string => icon !== null),
    ...archetypeFigures(data),
  ].map((file) => staticFile(file));
}
