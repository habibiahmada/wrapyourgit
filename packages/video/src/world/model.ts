/*
 * What the web player needs from the story beside the ride itself: the sounds it plays on a tap,
 * the timeline's type and the chrome's safe area. Kept free of Remotion and React (see
 * web-modules.test.ts), unlike the ride's own entry.
 */
import type { Timeline } from "./timeline";

// Interactive mode renders no audio: the web player plays these itself, on the tap that moves.
export {
  CUT_FADE_SECONDS,
  loops,
  RAILS_IN_SECONDS,
  SFX,
  type SfxName,
  sfxFile,
} from "../audio/sfx";
/** The chrome's safe area in scene units, for web overlays that must keep clear of it too. */
export { safeArea } from "./scenes/fit";
export {
  arrivalSound,
  edgeSounds,
  TAP_SOUND,
  TRAVEL_SOUND,
  travelSound,
  videoSounds,
} from "./sound";
export type { Timeline };
