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
    default:
      return "dive";
  }
}
