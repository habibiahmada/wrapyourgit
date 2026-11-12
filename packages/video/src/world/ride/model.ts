/*
 * Everything the ride needs, pure: the stops with their places, the timeline, the month gates,
 * and the whole picture at any frame as a camera and two lists of solids. RideStory only draws
 * what `rideFrame` returns, and the web reads stop frames from `buildRide` without React.
 */
import { layoutForSize, type RecapData, VIDEO_FPS } from "@wyg/schema";
import { congratsLetter } from "../../letter";
import { buildCity, type City } from "../city";
import { paginateLetter } from "../scenes/letter.model";
import { easeInOutCubic, type WorldMode } from "../timeline";
import { rideCamera, stationShot } from "./camera";
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
  idleClock,
  type RideTimeline,
  trainAt,
} from "./timeline";
import { at, heading, railEnd } from "./track";
import { CELL_SEAT, smoke, train } from "./train";

export type RideModel = { city: City; stops: RideStop[]; timeline: RideTimeline; gates: Gate[] };
/** `letter: false` builds the ride without the letter's pages, for the public page. */
export type RideOptions = { letter?: boolean };

/** The parts of a station that carry its chapter: the camera keeps these in frame. */
export const HERO_TAGS = [
  "language",
  "container",
  "board",
  "covered",
  "shuttered",
  "flag",
  "first-square",
  "sprout",
  "vault",
  "lighthouse",
  "lighthouse-base",
  "wagon",
  "cargo",
  "observatory",
  "dome",
  "star",
  "departures",
  "plane-flying",
  "plane-parked",
  "marquee",
  "weight",
  "stage",
];

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
  const layout = layoutForSize(format.width, format.height);
  // How tall each station's finished hero is, so the camera can frame it whatever the data.
  const stops = rideStops(data, city, { letterPages, letter }).map((stop) => {
    const station = STATIONS[stop.kind];
    if (!station) return stop;
    const ctx = stationContext(data, city, stop, 1, 0, 0, layout);
    let heroTop = 0;
    // Every corner of every part of the hero: all of them have to be in the picture. (Only the
    // outermost corners used to be kept, and one that was not outermost on the ground could
    // still be the highest on screen.)
    const heroEdge: [number, number, number][] = [];
    for (const solid of station(ctx)) {
      // The plaza itself may run out of frame; what must stay in is what carries the chapter.
      if (solid.kind !== "box" || !HERO_TAGS.includes(solid.tag ?? "")) continue;
      heroTop = Math.max(heroTop, solid.at[2] + solid.size[2]);
      const [px, py] = solid.pivot ?? [ctx.c[0], ctx.c[1]];
      const cos = Math.cos(solid.yaw ?? 0);
      const sin = Math.sin(solid.yaw ?? 0);
      for (const x of [solid.at[0], solid.at[0] + solid.size[0]]) {
        for (const y of [solid.at[1], solid.at[1] + solid.size[1]]) {
          const wx = px + (x - px) * cos - (y - py) * sin;
          const wy = py + (x - px) * sin + (y - py) * cos;
          heroEdge.push([wx, wy, solid.at[2]], [wx, wy, solid.at[2] + solid.size[2]]);
        }
      }
    }
    return { ...stop, heroTop, heroEdge };
  });
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

/** The share of a hero's build over which it grows out of the ground. */
const RISE_UNTIL = 0.5;

const solidKey = (solid: Solid): string =>
  solid.kind === "box"
    ? `box|${solid.tag}|${solid.at.join(",")}|${solid.size.join(",")}`
    : solid.kind === "ball"
      ? `ball|${solid.c.join(",")}|${solid.r}`
      : `picture|${solid.href}|${solid.c.join(",")}`;

/** `solid` at `grown` (0 to 1) of its height and of its height over the ground at `floor`. */
function risen(solid: Solid, floor: number, grown: number): Solid {
  const lift = (z: number) => floor + (z - floor) * grown;
  if (solid.kind === "box") {
    return {
      ...solid,
      at: [solid.at[0], solid.at[1], lift(solid.at[2])],
      size: [solid.size[0], solid.size[1], solid.size[2] * grown],
    };
  }
  if (solid.kind === "ball") {
    return { ...solid, c: [solid.c[0], solid.c[1], lift(solid.c[2])], r: solid.r * grown };
  }
  return {
    ...solid,
    c: [solid.c[0], solid.c[1], lift(solid.c[2])],
    wide: solid.wide * grown,
    tall: solid.tall * grown,
  };
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
  const layout = layoutForSize(format.width, format.height);
  const weeks = Math.max(...city.plots.map((plot) => plot.col)) + 1;
  // The whole year is always on the ground: the rail doubles back, so a run the train is not on
  // can be in the picture, and squares or signs that came and went with the train's place popped
  // in and out there. Only the sleepers keep to the stretch round the train.
  const view = {
    trainS,
    from: 0,
    to: railEnd(weeks),
    overview,
    detail: [trainS - BEHIND, trainS + AHEAD] as [number, number],
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
  const clock = idleClock(frameIndex, timeline);
  const yaw =
    heading(trainS) + (turnTo ? stationShot(turnTo).theta * turnTo.side * 0.85 * turn : 0);

  objects.push(...train(trainS));
  objects.push(...smoke(frameIndex, trainS, speed));
  objects.push(...cell(at(trainS + CELL_SEAT, 0, 0.5), yaw, clock, mood, amount));

  stops.forEach((stop, i) => {
    const station = STATIONS[stop.kind];
    if (!station) return;
    // Every station is always there: its plaza and its sign from the start, its hero from the
    // moment the train pulls in, for the rest of the ride. Nothing is put up or taken down by
    // where the train is, so nothing appears or goes when a shot happens to catch it.
    const build = buildProgress(i, frameIndex, timeline, fps);
    const ctx = stationContext(data, city, stop, build, clock, overview, layout);
    const solids = station(ctx);
    if (build <= 0 || build >= RISE_UNTIL || stop.kind === "city") {
      objects.push(...solids);
      return;
    }
    // While it builds, what was not there before grows out of the ground instead of starting in
    // mid-air: a hero that began its drop five units up was simply there, all at once.
    const before = new Set(station({ ...ctx, build: 0 }).map(solidKey));
    const grown = easeInOutCubic(build / RISE_UNTIL);
    objects.push(
      ...solids.map((solid) =>
        before.has(solidKey(solid)) ? solid : risen(solid, ctx.c[2], grown),
      ),
    );
  });

  const reach = Math.hypot(
    cam.pos[0] - cam.look[0],
    cam.pos[1] - cam.look[1],
    cam.pos[2] - cam.look[2],
  );
  const near = Math.max(20, reach * 1.5);
  return { cam, roll, fog: { color: HAZE, near, far: near + 30 }, ground, objects };
}
