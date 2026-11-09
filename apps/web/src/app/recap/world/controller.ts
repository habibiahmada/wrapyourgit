import type { Timeline } from "@wyg/video/world";

type Direction = 1 | -1;

export type ControllerState = {
  stop: number;
  moving: null | {
    from: number;
    to: number;
    startFrame: number;
    endFrame: number;
    direction: Direction;
  };
  queued: Direction | null;
};

export function initialState(): ControllerState {
  return { stop: 0, moving: null, queued: null };
}

export function request(
  state: ControllerState,
  direction: Direction,
  timeline: Timeline,
): { state: ControllerState; start: boolean } {
  // While a move plays, only the newest intent is kept: rapid taps must not stack up moves.
  if (state.moving) return { state: { ...state, queued: direction }, start: false };

  const to = state.stop + direction;
  const startFrame = timeline.stopFrames[state.stop];
  const endFrame = timeline.stopFrames[to];
  if (startFrame === undefined || endFrame === undefined) return { state, start: false };

  return {
    state: { ...state, moving: { from: state.stop, to, startFrame, endFrame, direction } },
    start: true,
  };
}

/**
 * The frame to show during a move, or null when the camera rests: frame 0 is a real frame (the
 * first stop), so "no move" can't be 0. At rest the player shows `timeline.stopFrames[state.stop]`.
 */
export function frameAt(state: ControllerState, elapsedMs: number, fps: number): number | null {
  const move = state.moving;
  if (!move) return null;
  // Clamped at 0 so clock skew on the first tick never lands before startFrame.
  const travelled = Math.max(0, Math.floor((elapsedMs * fps) / 1000));
  const frame = move.startFrame + move.direction * travelled;
  return move.direction === 1 ? Math.min(frame, move.endFrame) : Math.max(frame, move.endFrame);
}

export function settle(state: ControllerState): { state: ControllerState; next: Direction | null } {
  const stop = state.moving ? state.moving.to : state.stop;
  return { state: { stop, moving: null, queued: null }, next: state.queued };
}
