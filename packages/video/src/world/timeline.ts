import type { Camera } from "./camera";

export type WorldMode = "interactive" | "video";

export type Timeline = {
  /** Frame where the camera rests on stop i (in video mode, where its hold begins). */
  stopFrames: number[];
  /** Length of the move from stop i - 1 to stop i; 0 for the first stop. */
  moveFrames: number[];
  /**
   * True where stop i sits on the same plot as stop i - 1 (the letter's pages): nothing travels, so
   * the move is the scene's own transition and the cards cut instead of crossfading.
   */
  inPlace?: boolean[];
  durationInFrames: number;
};

export const MOVE_MIN_SECONDS = 1.1;
export const MOVE_MAX_SECONDS = 2;
export const HOLD_SECONDS = 3;

/** Past this much change (distance in spans plus zoom in e-folds) a move takes the maximum time. */
const MOVE_SATURATION = 6;

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function moveSeconds(a: Camera, b: Camera): number {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const change = distance / Math.max(a.span, b.span) + Math.abs(Math.log(b.span / a.span));
  return (
    MOVE_MIN_SECONDS + (MOVE_MAX_SECONDS - MOVE_MIN_SECONDS) * Math.min(1, change / MOVE_SATURATION)
  );
}

/**
 * `inPlace[i]` comes from the caller (stops sharing a plot), not from comparing cameras: two
 * different plots can project to the same camera in iso view.
 */
export function buildTimeline(
  cameras: Camera[],
  mode: WorldMode,
  fps: number,
  inPlace: readonly boolean[] = [],
): Timeline {
  const hold = mode === "video" ? Math.round(HOLD_SECONDS * fps) : 0;
  const stopFrames: number[] = [];
  const moveFrames: number[] = [];
  let frame = 0;
  for (let i = 0; i < cameras.length; i++) {
    const prev = cameras[i - 1];
    const cam = cameras[i];
    const move = prev && cam ? Math.round(moveSeconds(prev, cam) * fps) : 0;
    if (i > 0) frame += hold + move;
    stopFrames.push(frame);
    moveFrames.push(move);
  }
  const last = stopFrames.at(-1) ?? 0;
  return {
    stopFrames,
    moveFrames,
    inPlace: cameras.map((_, i) => i > 0 && (inPlace[i] ?? false)),
    durationInFrames: last + hold + 1,
  };
}
