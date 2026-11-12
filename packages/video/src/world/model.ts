import { type RecapData, VIDEO_FPS } from "@wyg/schema";
import { congratsLetter } from "../letter";
import { type Camera, stopCamera } from "./camera";
import { buildCity, type City } from "./city";
import { paginateLetter } from "./scenes/letter.model";
import { buildStops, type Stop } from "./stops";
import { buildTimeline, type Timeline, type WorldMode } from "./timeline";

// Interactive mode renders no audio: the web player plays these itself, on the tap that moves.
export {
  CUT_FADE_SECONDS,
  loops,
  RAILS_IN_SECONDS,
  SFX,
  type SfxName,
  sfxFile,
} from "../audio/sfx";
export {
  arrivalSound,
  edgeSounds,
  TAP_SOUND,
  TRAVEL_SOUND,
  travelSound,
  videoSounds,
} from "./sound";
export type { Timeline };

export type WorldModel = { city: City; stops: Stop[]; cameras: Camera[]; timeline: Timeline };

/** `letter: false` builds the world without the letter's pages, for the public page. */
export type WorldOptions = { letter?: boolean };

type Format = { width: number; height: number };

/** Everything the story world needs, pure, so the web player can read stop frames without React. */
export function buildWorld(
  data: RecapData,
  format: Format,
  mode: WorldMode,
  fps: number,
  options: WorldOptions = {},
): WorldModel {
  const city = buildCity(data);
  // The letter's pages depend on the frame's size, so each format gets its own count of stops.
  const letter = options.letter ?? true;
  const letterPages = letter ? paginateLetter(congratsLetter(data), format).length : 1;
  const stops = buildStops(data, city, { letterPages, letter });
  const cameras = stops.map((stop) => stopCamera(stop, city, format));
  // Only the letter's pages share a plot: moving between them is a page turn, not a flight.
  const inPlace = stops.map((stop, i) => stop.plot !== null && stop.plot === stops[i - 1]?.plot);
  return { city, stops, cameras, timeline: buildTimeline(cameras, mode, fps, inPlace) };
}

export function worldDuration(
  data: RecapData,
  format: Format,
  mode: WorldMode,
  options?: WorldOptions,
): number {
  return buildWorld(data, format, mode, VIDEO_FPS, options).timeline.durationInFrames;
}
/** The chrome's safe area in scene units, for web overlays that must keep clear of it too. */
export { safeArea } from "./scenes/fit";
