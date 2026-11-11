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
export const MOVE_MAX_SECONDS = 3.2;
/** A hero builds over the last part of the move in, so it is finished on its stop's frame. */
export const BUILD_SECONDS = 1.2;

/** Past this distance along the rail a move takes the longest time. */
const MOVE_SATURATION = 16;

export type RideTimeline = Timeline & {
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
  let frame = 0;
  stops.forEach((stop, i) => {
    const prev = stops[i - 1];
    const distance = prev ? Math.abs(stop.s - prev.s) : 0;
    const seconds =
      MOVE_MIN_SECONDS +
      (MOVE_MAX_SECONDS - MOVE_MIN_SECONDS) * Math.min(1, distance / MOVE_SATURATION);
    // A letter's pages share a place: nothing travels, so the move is the page turn alone.
    const move = !prev || distance === 0 ? 0 : Math.round(seconds * fps);
    if (prev) frame += holdFrames + move;
    stopFrames.push(frame);
    moveFrames.push(move);
    inPlace.push(Boolean(prev) && distance === 0);
  });
  return {
    stopFrames,
    moveFrames,
    inPlace,
    restFrames,
    holdFrames,
    durationInFrames: (stopFrames.at(-1) ?? 0) + holdFrames + 1,
  };
}

/** Where the engine's nose is at a frame: at rest through a hold, eased between stops in a move. */
export function trainAt(frame: number, stops: readonly RideStop[], timeline: RideTimeline): number {
  for (let i = stops.length - 1; i >= 0; i--) {
    const arrive = timeline.stopFrames[i] ?? 0;
    const stop = stops[i];
    if (!stop) continue;
    if (frame >= arrive) return stop.s;
    const move = timeline.moveFrames[i] ?? 0;
    const prev = stops[i - 1];
    if (prev && frame > arrive - move) {
      return prev.s + (stop.s - prev.s) * easeInOutCubic((frame - (arrive - move)) / move);
    }
  }
  return stops[0]?.s ?? 0;
}

/** 0 until BUILD_SECONDS before stop i's frame, eased to 1 at that frame, 1 from then on. */
export function buildProgress(
  i: number,
  frame: number,
  timeline: RideTimeline,
  fps: number,
): number {
  if (i === 0) return 1;
  const frames = Math.round(BUILD_SECONDS * fps);
  const t = (frame - ((timeline.stopFrames[i] ?? 0) - frames)) / frames;
  return easeInOutCubic(Math.max(0, Math.min(1, t)));
}
