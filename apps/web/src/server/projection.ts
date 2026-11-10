import { withoutPrivateNames } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";

// Kept apart from privacy.ts so tests can import it without the server-only database module.

/** The recap the owner's own story and files use: public view unless they chose to show names. */
export function storyData(data: RecapData, showPrivateNames: boolean): RecapData {
  return showPrivateNames ? data : withoutPrivateNames(data);
}

/** True when the files would differ once private names are removed, i.e. a private name would appear. */
export function hasPrivateNames(data: RecapData): boolean {
  return JSON.stringify(data) !== JSON.stringify(withoutPrivateNames(data));
}

/** The files' reminder shows only when the owner chose to show names and the recap has private ones. */
export function showFilesReminder(choice: boolean | null, data: RecapData): boolean {
  return choice === true && hasPrivateNames(data);
}
