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
import type { Frame, RideCamera, V3 } from "./project";
import { STATIONS } from "./stations";
import { stationContext } from "./stations/kit";
import { deskShot } from "./stations/letter";
import { type RideStop, rideStops } from "./stops";
import {
  buildFrames,
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
  "gate",
  "month",
  "podium",
  "trophy",
  "container",
  "board",
  "covered",
  "shuttered",
  "flag",
  "first-square",
  "graph-wall",
  "sprout",
  "vault",
  "record-base",
  "record-tower",
  "calendar",
  "medal",
  "wagon",
  "cargo",
  "observatory",
  "dome",
  "star",
  "envelope",
  "desk",
  "post-box",
  "pr-board",
  "pr-merged",
  "pr-open",
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
      if (solid.kind === "picture" && solid.reach !== undefined) {
        // A figure on a sheet: the camera frames how high it stands, not the sheet.
        heroTop = Math.max(heroTop, solid.c[2] + solid.reach);
        // A picture always faces the camera, so its width on screen is the same from every
        // side: a ring of that radius on the ground is as wide as it, whichever way the shot looks.
        const spread = solid.spread ?? 0;
        for (let k = 0; k < 8 && spread > 0; k++) {
          const a = (k / 8) * Math.PI * 2;
          heroEdge.push([
            solid.c[0] + Math.cos(a) * spread,
            solid.c[1] + Math.sin(a) * spread,
            solid.c[2],
          ]);
        }
        continue;
      }
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

/**
 * The frame the train and the riding camera are at. It is the frame itself, except round the
 * letter: the move in to its first page ends with the time at the desk, so the travel is done in
 * the frames before that and the train then stands; and the move away from its last page begins
 * with the camera coming back out, so the train does not start until that is over.
 */
export function rideClock(model: RideModel, frame: number): number {
  const { stops, timeline } = model;
  for (let i = 1; i < stops.length; i++) {
    const stop = stops[i];
    const prev = stops[i - 1];
    const end = timeline.stopFrames[i] ?? 0;
    const total = timeline.moveFrames[i] ?? 0;
    const start = end - total;
    if (frame <= start || frame >= end) continue;
    if (stop?.kind === "letter" && (stop.page ?? 1) === 1 && total > timeline.letterIntro) {
      return start + Math.min(1, (frame - start) / (total - timeline.letterIntro)) * total;
    }
    if (prev?.kind === "letter" && stop?.kind !== "letter" && total > timeline.letterOutro) {
      const moved = (frame - start - timeline.letterOutro) / (total - timeline.letterOutro);
      return start + Math.max(0, moved) * total;
    }
  }
  return frame;
}

/** What the letter's stop is doing at a frame. */
export type LetterBeat = {
  /** How far the camera has come in from the station's shot to the desk, 0 to 1. */
  push: number;
  /** How far the envelope on the desk is open, 0 to 1. */
  open: number;
  /** The sheet over the scene, or null when no page is to be seen. */
  sheet: { stop: RideStop; enter: number; opacity: number } | null;
};

const AWAY: LetterBeat = { push: 0, open: 0, sheet: null };

/**
 * The letter, beat by beat. The train stops and stands a moment at the station's own shot; the
 * camera comes in to the desk; the envelope on it opens and the letter comes out; and the sheet
 * comes up over the scene, whole on the first page's frame: the one place where text covers the
 * picture (spec "Calls"). A later page turns at the end of the hold of the one before it, the
 * camera still. When the last page's hold is over the sheet goes, the envelope closes, and the
 * camera comes back out to the station before the train leaves. The public ride has no letter.
 */
export function letterBeat(model: RideModel, frame: number): LetterBeat {
  const { stops, timeline } = model;
  const first = stops.findIndex((stop) => stop.kind === "letter");
  if (first === -1) return AWAY;
  const last = stops.findLastIndex((stop) => stop.kind === "letter");
  const begins = timeline.stopFrames[first] ?? 0;
  const arrives = begins - timeline.letterIntro;
  const leaves = (timeline.stopFrames[last] ?? 0) + timeline.holdFrames;
  if (frame <= arrives || frame >= leaves + timeline.letterOutro) return AWAY;
  const page = stops[first] as RideStop;
  if (frame < begins) {
    const t = (frame - arrives) / Math.max(1, timeline.letterIntro);
    const up = clamp01((t - 0.84) / 0.16);
    return {
      push: easeInOutCubic(clamp01((t - 0.14) / 0.32)),
      // Even, not eased: the station's own beats (flap, letter out, letter up) ease themselves.
      open: clamp01((t - 0.4) / 0.44),
      sheet: up > 0 ? { stop: page, enter: up, opacity: up } : null,
    };
  }
  if (frame > leaves) {
    const t = (frame - leaves) / Math.max(1, timeline.letterOutro);
    const gone = clamp01(t / 0.3);
    return {
      push: 1 - easeInOutCubic(clamp01((t - 0.3) / 0.7)),
      open: 1 - easeInOutCubic(clamp01((t - 0.1) / 0.45)),
      sheet: gone < 1 ? { stop: stops[last] as RideStop, enter: 1, opacity: 1 - gone } : null,
    };
  }
  // On a page: whole through its hold, and the next one sliding in over the move to it.
  const reached = stops.findLastIndex((_, i) => frame >= (timeline.stopFrames[i] ?? 0));
  const next = stops[reached + 1];
  const nextAt = timeline.stopFrames[reached + 1];
  if (next?.kind === "letter" && nextAt !== undefined) {
    const frames = Math.max(1, timeline.moveFrames[reached + 1] ?? 1);
    const enter = clamp01((frame - (nextAt - frames)) / frames);
    if (enter > 0) return { push: 1, open: 1, sheet: { stop: next, enter, opacity: 1 } };
  }
  return { push: 1, open: 1, sheet: { stop: stops[reached] as RideStop, enter: 1, opacity: 1 } };
}

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
  /**
   * Frames the idle motion runs ahead of `frameIndex`: the web player carries the rest loop's
   * phase into a move with it, so a tap part way through the loop sets off without a jump.
   */
  idle = 0,
): { cam: RideCamera; roll: number; fog: Fog; ground: Solid[]; objects: Solid[] } {
  const { city, stops, timeline } = model;
  // Round the letter the train and the riding camera keep their own time (rideClock).
  const tick = rideClock(model, frameIndex);
  const beat = letterBeat(model, frameIndex);
  const trainS = trainAt(tick, stops, timeline);
  const riding = rideCamera(tick, stops, timeline, format);
  const { speed } = riding;
  let { cam, roll } = riding;
  const overview = overviewAt(tick, model);
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
  let to = stops.findIndex((_, i) => tick <= (timeline.stopFrames[i] ?? 0));
  if (to === -1) to = stops.length - 1;
  const arrive = timeline.stopFrames[to] ?? 0;
  const resting = stops.findLast((_, i) => tick >= (timeline.stopFrames[i] ?? 0)) ?? stops[0];
  const moving = speed > 0;
  const dest = stops[to];

  // Cell faces forward on the ride. At a station it turns to the camera across the rail as the
  // train pulls in, and turns back as it leaves.
  const facesCamera = (stop: RideStop | undefined) =>
    stop && stop.kind !== "hello" && stop.kind !== "city";
  let turn = 0;
  let turnTo: RideStop | undefined;
  if (moving && facesCamera(dest) && arrive - tick <= TURN_FRAMES) {
    turn = easeInOutCubic(1 - (arrive - tick) / TURN_FRAMES);
    turnTo = dest;
  } else if (facesCamera(resting) && resting) {
    const left = (timeline.stopFrames[stops.indexOf(resting)] ?? 0) + timeline.holdFrames;
    turn = moving ? easeInOutCubic(clamp01(1 - (tick - left) / TURN_FRAMES)) : 1;
    turnTo = resting;
  }
  // Cell cheers while a hero builds and waves while the train moves. Both ease in and out (the
  // cheer over the build, the wave with the speed), so its pose never snaps at a stop.
  const built = clamp01(1 - (arrive - tick) / buildFrames(to, timeline, fps));
  const building = Boolean(dest?.plaza) && moving && built > 0;
  const mood: Mood = building ? "cheer" : moving ? "ride" : "idle";
  const amount = building ? Math.sin(built * Math.PI) ** 2 : Math.min(1, speed * 4);
  const clock = idleClock(tick, timeline) + idle;
  const yaw =
    heading(trainS) + (turnTo ? stationShot(turnTo).theta * turnTo.side * 0.85 * turn : 0);

  objects.push(...train(trainS));
  objects.push(...smoke(frameIndex, trainS, speed));
  objects.push(...cell(at(trainS + CELL_SEAT, 0, 0.5), yaw, clock, mood, amount));

  stops.forEach((stop, i) => {
    const station = STATIONS[stop.kind];
    // The letter's pages all stop at one place: its station is drawn once, for the first.
    if (!station || (stop.page ?? 1) > 1) return;
    // Every station is always there: its plaza and its sign from the start, its hero from the
    // moment the train pulls in, for the rest of the ride. Nothing is put up or taken down by
    // where the train is, so nothing appears or goes when a shot happens to catch it.
    // The letter's station is whole when the train stops, which is before its first page's frame.
    const first = stop.kind === "letter";
    const build = buildProgress(i, frameIndex + (first ? timeline.letterIntro : 0), timeline, fps);
    const ctx = {
      ...stationContext(data, city, stop, build, clock, overview, layout),
      letterOpen: first ? beat.open : 0,
    };
    // At the letter the camera leaves the station's shot for the desk, and comes back to it.
    if (first && beat.push > 0) {
      const desk = deskShot(ctx);
      const mix = (a: V3, b: V3): V3 => [
        a[0] + (b[0] - a[0]) * beat.push,
        a[1] + (b[1] - a[1]) * beat.push,
        a[2] + (b[2] - a[2]) * beat.push,
      ];
      cam = {
        pos: mix(cam.pos, desk.pos),
        look: mix(cam.look, desk.look),
        fov: cam.fov + (desk.fov - cam.fov) * beat.push,
      };
      roll *= 1 - beat.push;
    }
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
