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

/**
 * What plays while the camera travels to a stop. A move in place (a letter page turn) isn't a
 * flight, so it gets none and leaves the stage to the arrival sound.
 */
export function travelSound(to: StopKind, inPlace: boolean): SfxName | null {
  return inPlace ? null : transitionSound(to);
}

/** The sound of the camera settling at a stop; the city is already covered by the wind. */
export function arrivalSound(kind: StopKind): SfxName | null {
  switch (kind) {
    case "hello":
      return "hello";
    case "first-day":
      return "sprout";
    case "private":
      return "lock";
    case "busiest":
      return "flag";
    case "rhythm":
      return "chug";
    case "languages":
      return "bloom";
    case "projects":
      return "crate";
    case "community":
      return "twinkle";
    case "engineering":
      return "landing";
    case "archetype":
      return "spotlight";
    case "versus":
      return "seesaw";
    case "letter":
      return "page";
    case "closing":
      return "firework";
    case "city":
      return null;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
