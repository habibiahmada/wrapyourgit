import type { SfxName } from "../audio/sfx";
import type { Stop, StopKind } from "./stops";
import type { Timeline } from "./timeline";

export const TAP_SOUND: SfxName = "tap";

/** Every move of the ride is the train on its rails. */
export const TRAVEL_SOUND: SfxName = "rails";

/**
 * What plays while the train travels to a stop. A move in place (a letter page turn) isn't a
 * journey, so it gets none and leaves the stage to the arrival sound.
 */
export function travelSound(_to: StopKind, inPlace: boolean): SfxName | null {
  return inPlace ? null : TRAVEL_SOUND;
}

/** The sound of the camera settling at a stop; the city view has none. */
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

/**
 * The sounds of moving from stop `from` to stop `to` (either direction). A move plays the edge
 * between the two stops, which belongs to the later one, so whether it is a page turn comes from
 * `inPlace[max(from, to)]`; what plays is keyed by the destination.
 */
export function edgeSounds(
  timeline: Pick<Timeline, "inPlace">,
  stops: readonly Pick<Stop, "kind">[],
  from: number,
  to: number,
): { travel: SfxName | null; arrival: SfxName | null } {
  const target = stops[to];
  if (!target) return { travel: null, arrival: null };
  const inPlace = timeline.inPlace?.[Math.max(from, to)] ?? false;
  return { travel: travelSound(target.kind, inPlace), arrival: arrivalSound(target.kind) };
}

/**
 * Every sound of the video, in stop order: each stop's travel at its move start, then its arrival.
 * A travel sound lasts as long as its move (`frames`), so the wheels stop when the train does.
 */
export function videoSounds(world: {
  stops: readonly Pick<Stop, "kind">[];
  timeline: Pick<Timeline, "stopFrames" | "moveFrames" | "inPlace">;
}): { frame: number; sound: SfxName; frames?: number }[] {
  const { stops, timeline } = world;
  return stops.flatMap((_, i) => {
    const at = timeline.stopFrames[i] ?? 0;
    const move = timeline.moveFrames[i] ?? 0;
    const { travel, arrival } = edgeSounds(timeline, stops, i - 1, i);
    return [
      ...(i > 0 && travel ? [{ frame: at - move, sound: travel, frames: move }] : []),
      ...(arrival ? [{ frame: at, sound: arrival }] : []),
    ];
  });
}
