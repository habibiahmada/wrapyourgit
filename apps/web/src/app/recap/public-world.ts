import { toPublicRecap } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";

/**
 * What a visitor's story is built from: the public projection and no letter. The one place that
 * decides what a visitor sees. `loadPublicRecap` has already projected the data; projecting again
 * is cheap and keeps the guarantee here, next to the player, whatever its caller passed in.
 */
export function publicWorld(data: RecapData): { data: RecapData; letter: false } {
  return { data: toPublicRecap(data), letter: false };
}
