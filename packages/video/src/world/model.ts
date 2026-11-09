import { type RecapData, VIDEO_FPS } from "@wyg/schema";
import { type Camera, stopCamera } from "./camera";
import { buildCity, type City } from "./city";
import { buildStops, type Stop } from "./stops";
import { buildTimeline, type Timeline, type WorldMode } from "./timeline";

// Interactive mode renders no audio: the web player plays these itself, on the tap that moves.
export { SFX, type SfxName, sfxFile } from "../audio/sfx";
export { TAP_SOUND, transitionSound } from "./sound";
export type { Timeline };

export type WorldModel = { city: City; stops: Stop[]; cameras: Camera[]; timeline: Timeline };

type Format = { width: number; height: number };

/** Everything the story world needs, pure, so the web player can read stop frames without React. */
export function buildWorld(
  data: RecapData,
  format: Format,
  mode: WorldMode,
  fps: number,
): WorldModel {
  const city = buildCity(data);
  const stops = buildStops(data, city);
  const cameras = stops.map((stop) => stopCamera(stop, city, format));
  return { city, stops, cameras, timeline: buildTimeline(cameras, mode, fps) };
}

export function worldDuration(data: RecapData, format: Format, mode: WorldMode): number {
  return buildWorld(data, format, mode, VIDEO_FPS).timeline.durationInFrames;
}
