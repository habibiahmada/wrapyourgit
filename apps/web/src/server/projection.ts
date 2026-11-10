import { withoutPrivateNames } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";
import { drawsPrivateName } from "@wyg/video/present";

// Kept apart from privacy.ts so tests can import it without the server-only database module.

/** The recap the owner's own story and files use: public view unless they chose to show names. */
export function storyData(data: RecapData, showPrivateNames: boolean): RecapData {
  return showPrivateNames ? data : withoutPrivateNames(data);
}

/**
 * True when the story, and so every file made from it, draws a private repository's name. Asks the
 * scenes (`drawsPrivateName`) rather than diffing the data: a private repository the story never
 * names (sixth on the list, only starred, only most forked) must not trigger the reminder.
 */
export function hasPrivateNames(data: RecapData): boolean {
  return drawsPrivateName(data);
}

/** The files' reminder shows only when the owner chose to show names and the recap has private ones. */
export function showFilesReminder(choice: boolean | null, data: RecapData): boolean {
  return choice === true && hasPrivateNames(data);
}
