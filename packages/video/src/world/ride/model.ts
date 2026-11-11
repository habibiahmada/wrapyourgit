/*
 * Everything the ride needs, pure: the stops with their places, the timeline, the month gates,
 * and the whole picture at any frame as a camera and two lists of solids. RideStory only draws
 * what `rideFrame` returns, and the web reads stop frames from `buildRide` without React.
 */
import { type RecapData, VIDEO_FPS } from "@wyg/schema";
import { congratsLetter } from "../../letter";
import { buildCity, type City } from "../city";
import { paginateLetter } from "../scenes/letter.model";
import { easeInOutCubic, type WorldMode } from "../timeline";
import { rideCamera, SHOTS } from "./camera";
import { cell, type Mood } from "./cell";
import { type Gate, gates } from "./gates.model";
import { land } from "./land";
import { HAZE } from "./palette";
import type { Fog, Solid } from "./prims";
import type { Frame, RideCamera } from "./project";
import { STATIONS } from "./stations";
import { stationContext } from "./stations/kit";
import { type RideStop, rideStops } from "./stops";
import {
  BUILD_SECONDS,
  buildProgress,
  buildRideTimeline,
  type RideTimeline,
  trainAt,
} from "./timeline";
import { at, heading, railEnd } from "./track";
import { CELL_SEAT, smoke, train } from "./train";

export type RideModel = { city: City; stops: RideStop[]; timeline: RideTimeline; gates: Gate[] };
/** `letter: false` builds the ride without the letter's pages, for the public page. */
export type RideOptions = { letter?: boolean };

export function buildRide(
  data: RecapData,
  format: Frame,
  mode: WorldMode,
  fps: number,
  options: RideOptions = {},
): RideModel {
  const city = buildCity(data);
  const letter = options.letter ?? true;
  const letterPages = letter ? paginateLetter(congratsLetter(data), format).length : 1;
  const stops = rideStops(data, city, { letterPages, letter });
  return { city, stops, timeline: buildRideTimeline(stops, mode, fps), gates: gates(data, city) };
}

export function rideDuration(
  data: RecapData,
  format: Frame,
  mode: WorldMode,
  options?: RideOptions,
): number {
  return buildRide(data, format, mode, VIDEO_FPS, options).timeline.durationInFrames;
}

/** How far the track stays built behind and ahead of the train on the ride. */
const BEHIND = 26;
const AHEAD = 56;
/** Frames over which Cell turns to the camera as the train pulls in, and back as it leaves. */
const TURN_FRAMES = 20;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 0 on the ride, 1 while the camera rests high above the whole rail, eased in and out with its moves. */
function overviewAt(frame: number, model: RideModel): number {
  const { stops, timeline } = model;
  const i = stops.findIndex((stop) => stop.kind === "city");
  if (i === -1) return 0;
  const arrive = timeline.stopFrames[i] ?? 0;
  const leave = arrive + timeline.holdFrames;
  const next = timeline.stopFrames[i + 1] ?? leave;
  if (frame <= arrive)
    return easeInOutCubic(clamp01(1 - (arrive - frame) / Math.max(1, timeline.moveFrames[i] ?? 1)));
  if (frame <= leave) return 1;
  return easeInOutCubic(clamp01(1 - (frame - leave) / Math.max(1, next - leave)));
}

/** Everything on screen at a frame: what RideStory draws and what the tests read. */
export function rideFrame(
  model: RideModel,
  data: RecapData,
  frameIndex: number,
  format: Frame,
  fps: number,
): { cam: RideCamera; roll: number; fog: Fog; ground: Solid[]; objects: Solid[] } {
  const { city, stops, timeline } = model;
  const trainS = trainAt(frameIndex, stops, timeline);
  const { cam, roll, speed } = rideCamera(frameIndex, stops, timeline, format);
  const overview = overviewAt(frameIndex, model);
  const weeks = Math.max(...city.plots.map((plot) => plot.col)) + 1;
  const view = {
    trainS,
    from: lerp(trainS - BEHIND, 0, overview),
    to: lerp(trainS + AHEAD, railEnd(weeks), overview),
    overview,
  };
  const { ground, objects } = land(city, model.gates, stops, view);

  // The stop the train is at, or is pulling into.
  let to = stops.findIndex((_, i) => frameIndex <= (timeline.stopFrames[i] ?? 0));
  if (to === -1) to = stops.length - 1;
  const arrive = timeline.stopFrames[to] ?? 0;
  const resting = stops.findLast((_, i) => frameIndex >= (timeline.stopFrames[i] ?? 0)) ?? stops[0];
  const moving = speed > 0;
  const dest = stops[to];

  // Cell faces forward on the ride. At a station it turns to the camera across the rail as the
  // train pulls in, and turns back as it leaves.
  const facesCamera = (stop: RideStop | undefined) =>
    stop && stop.kind !== "hello" && stop.kind !== "city";
  let turn = 0;
  let turnTo: RideStop | undefined;
  if (moving && facesCamera(dest) && arrive - frameIndex <= TURN_FRAMES) {
    turn = easeInOutCubic(1 - (arrive - frameIndex) / TURN_FRAMES);
    turnTo = dest;
  } else if (facesCamera(resting) && resting) {
    const left = (timeline.stopFrames[stops.indexOf(resting)] ?? 0) + timeline.holdFrames;
    turn = moving ? easeInOutCubic(clamp01(1 - (frameIndex - left) / TURN_FRAMES)) : 1;
    turnTo = resting;
  }
  // Cell cheers while a hero builds and waves while the train moves. Both ease in and out (the
  // cheer over the build, the wave with the speed), so its pose never snaps at a stop.
  const buildFrames = Math.round(BUILD_SECONDS * fps);
  const built = clamp01(1 - (arrive - frameIndex) / buildFrames);
  const building = Boolean(dest?.plaza) && moving && built > 0;
  const mood: Mood = building ? "cheer" : moving ? "ride" : "idle";
  const amount = building ? Math.sin(built * Math.PI) ** 2 : Math.min(1, speed * 4);
  // Idle motion counts from the last stop reached, so a stop's own frame is always the first
  // frame of its loop: the slide taken there never catches a blink.
  const clock = frameIndex - (timeline.stopFrames[resting ? stops.indexOf(resting) : 0] ?? 0);
  const yaw = heading(trainS) + (turnTo ? SHOTS.ISO.theta * turnTo.side * 0.85 * turn : 0);

  objects.push(...train(trainS));
  objects.push(...smoke(frameIndex, trainS, speed));
  objects.push(...cell(at(trainS + CELL_SEAT, 0, 0.5), yaw, clock, mood, amount));

  stops.forEach((stop, i) => {
    const station = STATIONS[stop.kind];
    if (!station) return;
    // The overview's billboard stands by the middle of the rail, wherever the train is.
    if (stop.kind !== "city" && (stop.s < view.from - 12 || stop.s > view.to + 12)) return;
    const build = buildProgress(i, frameIndex, timeline, fps);
    objects.push(...station(stationContext(data, city, stop, build, clock, overview)));
  });

  const reach = Math.hypot(
    cam.pos[0] - cam.look[0],
    cam.pos[1] - cam.look[1],
    cam.pos[2] - cam.look[2],
  );
  const near = Math.max(20, reach * 1.5);
  return { cam, roll, fog: { color: HAZE, near, far: near + 30 }, ground, objects };
}
