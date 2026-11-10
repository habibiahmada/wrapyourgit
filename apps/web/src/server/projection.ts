import { toPublicRecap } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";

// Kept apart from privacy.ts so tests can import it without the server-only database module.

/** The recap the owner's own story and files use: public view unless they chose to show names. */
export function storyData(data: RecapData, showPrivateNames: boolean): RecapData {
  return showPrivateNames ? data : toPublicRecap(data);
}

/** True when private repository names appear anywhere, so exports deserve a reminder. */
export function hasPrivateNames(data: RecapData): boolean {
  const starred = data.starred.status === "ok" ? data.starred.value.top : [];
  return [...data.repositories.top, ...starred].some((repo) => repo.isPrivate);
}
