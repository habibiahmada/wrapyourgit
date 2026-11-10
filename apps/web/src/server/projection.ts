import { toPublicRecap } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";

// Kept apart from privacy.ts so tests can import it without the server-only database module.

/** The recap the owner's own story and files use: public view unless they chose to show names. */
export function storyData(data: RecapData, showPrivateNames: boolean): RecapData {
  return showPrivateNames ? data : toPublicRecap(data);
}

/** True when the files would differ from the public view, i.e. a private name would appear. */
export function hasPrivateNames(data: RecapData): boolean {
  return JSON.stringify(data) !== JSON.stringify(toPublicRecap(data));
}
