import { easeInOutCubic, type Timeline, type WorldMode } from "../timeline";
import type { RideStop } from "./stops";

/** How long a stop holds in a video. */
export const HOLD_SECONDS = 3;
/**
 * The rest loop: a station keeps moving while it waits (smoke, Cell blinking), and every idle
 * cycle divides this length, so the loop's last frame leads back into its first.
 */
export const REST_SECONDS = 2;
export const MOVE_MIN_SECONDS = 1.6;
export const MOVE_MAX_SECONDS = 4.2;
/**
 * A hero builds over the last part of the move in, so it is finished on its stop's frame. It
 * takes this long where the move allows it: at 1.2 seconds a station was simply there, too fast
 * to watch it go up. It never takes more than BUILD_SHARE of the move, so it starts after the
 * train has left the stop before, whose camera stands right over this one.
 */
export const BUILD_SECONDS = 2.6;
const BUILD_SHARE = 0.8;

/** How many frames stop `i`'s hero takes to build. */
export function buildFrames(i: number, timeline: RideTimeline, fps: number): number {
  const move = timeline.moveFrames[i] ?? 0;
  return Math.max(1, Math.min(Math.round(BUILD_SECONDS * fps), Math.round(move * BUILD_SHARE)));
}

/** Past this distance along the rail a move takes the longest time. */
const MOVE_SATURATION = 24;

/**
 * At the letter the train stops first and the story then goes to the desk: a pause, the camera
 * coming in, the envelope opening, the sheet coming up. That takes this long, after the travel
 * and before the first page's frame. When the last page is read the camera comes back out to
 * the station before the train leaves, which takes the second.
 */
export const LETTER_INTRO_SECONDS = 4.4;
export const LETTER_OUTRO_SECONDS = 2.2;

export type RideTimeline = Timeline & {
  /** Frames at the desk before the letter's first page, at the end of the move in to it. */
  letterIntro: number;
  /** Frames coming back out from the desk, at the start of the move away from the last page. */
  letterOutro: number;
  /** Frames in one rest loop. */
  restFrames: number;
  /** Frames a stop holds before the train leaves: the hold in a video, one rest loop on the web. */
  holdFrames: number;
};

export function buildRideTimeline(
  stops: readonly RideStop[],
  mode: WorldMode,
  fps: number,
): RideTimeline {
  const restFrames = Math.round(REST_SECONDS * fps);
  const holdFrames = mode === "video" ? Math.round(HOLD_SECONDS * fps) : restFrames;
  const stopFrames: number[] = [];
  const moveFrames: number[] = [];
  const inPlace: boolean[] = [];
  const letterIntro = Math.round(LETTER_INTRO_SECONDS * fps);
  const letterOutro = Math.round(LETTER_OUTRO_SECONDS * fps);
  let frame = 0;
  stops.forEach((stop, i) => {
    const prev = stops[i - 1];
    const distance = prev ? Math.abs(stop.s - prev.s) : 0;
    // The camera climbs to the overview and comes down from it: a long way, whatever the rail's distance.
    const far = stop.kind === "city" || prev?.kind === "city";
    const seconds = far
      ? MOVE_MAX_SECONDS
      : MOVE_MIN_SECONDS +
        (MOVE_MAX_SECONDS - MOVE_MIN_SECONDS) * Math.min(1, distance / MOVE_SATURATION);
    // A letter's pages share a place: nothing travels, so the move is the page turn alone.
    const travel = !prev || distance === 0 ? 0 : Math.round(seconds * fps);
    // The time at the desk is part of the move it belongs to (see LETTER_INTRO_SECONDS).
    const opens = stop.kind === "letter" && (stop.page ?? 1) === 1 && Boolean(prev);
    const closes = prev?.kind === "letter" && stop.kind !== "letter";
    const move = travel + (opens ? letterIntro : 0) + (closes ? letterOutro : 0);
    if (prev) frame += holdFrames + move;
    stopFrames.push(frame);
    moveFrames.push(move);
    inPlace.push(Boolean(prev) && distance === 0);
  });
  return {
    stopFrames,
    moveFrames,
    inPlace,
    letterIntro,
    letterOutro,
    restFrames,
    holdFrames,
    durationInFrames: (stopFrames.at(-1) ?? 0) + holdFrames + 1,
  };
}

/** Where the engine's nose is at a frame: at rest through a hold, eased between stops in a move. */
/** The share of a move spent pulling away, and again pulling in. */
const RAMP = 0.25;

/**
 * How far along a move the train is at `t` of its time: it pulls away, holds one speed, and pulls
 * in. Its top speed is a third over its average, so a month gate's sign can be read on the way
 * past; a plain ease in and out would cross the middle at three times the average.
 */
function cruise(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  const top = 1 / (1 - RAMP);
  if (u < RAMP) return (top * u * u) / (2 * RAMP);
  if (u > 1 - RAMP) return 1 - (top * (1 - u) * (1 - u)) / (2 * RAMP);
  return top * (u - RAMP / 2);
}

export function trainAt(frame: number, stops: readonly RideStop[], timeline: RideTimeline): number {
  for (let i = stops.length - 1; i >= 0; i--) {
    const arrive = timeline.stopFrames[i] ?? 0;
    const stop = stops[i];
    if (!stop) continue;
    if (frame >= arrive) return stop.s;
    const move = timeline.moveFrames[i] ?? 0;
    const prev = stops[i - 1];
    if (prev && frame > arrive - move) {
      return prev.s + (stop.s - prev.s) * cruise((frame - (arrive - move)) / move);
    }
  }
  return stops[0]?.s ?? 0;
}

/** 0 until the build starts (buildFrames before stop i's frame), eased to 1 at that frame, 1 from then on. */
export function buildProgress(
  i: number,
  frame: number,
  timeline: RideTimeline,
  fps: number,
): number {
  if (i === 0) return 1;
  const frames = buildFrames(i, timeline, fps);
  const t = (frame - ((timeline.stopFrames[i] ?? 0) - frames)) / frames;
  return easeInOutCubic(Math.max(0, Math.min(1, t)));
}

/** Idle motion (a blink, a bob, the fireworks) repeats over this many frames. */
const IDLE_LOOP = 60;

/**
 * The clock idle motion runs on. It is 0 at every stop's own frame, so a slide taken there never
 * catches a blink, and counts frames through the hold, so a rest loop is exact. On the way to the
 * next stop it runs a little fast or slow, to land on a whole number of loops as the train
 * arrives: nothing that idles jumps at a station.
 */
export function idleClock(frame: number, timeline: RideTimeline): number {
  const { stopFrames, holdFrames } = timeline;
  const i = Math.max(
    0,
    stopFrames.findLastIndex((at) => frame >= at),
  );
  const since = frame - (stopFrames[i] ?? 0);
  const next = stopFrames[i + 1];
  if (since <= holdFrames || next === undefined) return since;
  const move = next - (stopFrames[i] ?? 0) - holdFrames;
  const loops = Math.max(
    Math.floor(holdFrames / IDLE_LOOP) + 1,
    Math.round((holdFrames + move) / IDLE_LOOP),
  );
  return holdFrames + ((since - holdFrames) * (loops * IDLE_LOOP - holdFrames)) / move;
}
