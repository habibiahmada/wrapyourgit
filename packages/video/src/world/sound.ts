import type { SfxName } from "../audio/sfx";
import type { StopKind } from "./stops";

export const TAP_SOUND: SfxName = "tap";

/**
 * The sound of arriving at a stop. Keyed by the destination only, so going back plays the sound of
 * the stop you land on, not the one you left.
 */
export function transitionSound(to: StopKind): SfxName {
  switch (to) {
    case "languages":
      return "leaves";
    case "community":
      return "crickets";
    case "city":
    case "closing":
      return "wind";
    case "hello":
    case "first-day":
    case "busiest":
    case "private":
    case "rhythm":
    case "projects":
    case "engineering":
    case "archetype":
    case "versus":
    case "letter":
      return "dive";
    default: {
      // A new StopKind fails typecheck here instead of silently getting "dive".
      const unreachable: never = to;
      return unreachable;
    }
  }
}
