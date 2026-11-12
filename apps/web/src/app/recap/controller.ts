import type { Timeline } from "@wyg/video/world";

type Direction = 1 | -1;

/**
 * The ride's timeline also says how long each stop holds before the train leaves (one rest loop
 * on the web) and how long that loop is. Today's story has neither: it moves from the stop's own
 * frame and rests on it.
 */
type StoryTimeline = Timeline & { holdFrames?: number; restFrames?: number };

export type ControllerState = {
  stop: number;
  moving: null | {
    from: number;
    to: number;
    startFrame: number;
    endFrame: number;
    direction: Direction;
    /** Where the rest loop was when the move began: idle motion carries on from there. */
    phase: number;
  };
  queued: Direction | null;
};

export function initialState(): ControllerState {
  return { stop: 0, moving: null, queued: null };
}

export function request(
  state: ControllerState,
  direction: Direction,
  timeline: StoryTimeline,
  phase = 0,
): { state: ControllerState; start: boolean } {
  // A tap while the train moves is dropped: however many come, it makes the one move, and the
  // reader taps again once it has stopped.
  if (state.moving) return { state, start: false };

  const to = state.stop + direction;
  const from = timeline.stopFrames[state.stop];
  const target = timeline.stopFrames[to];
  if (from === undefined || target === undefined) return { state, start: false };
  // The move between two stops starts after the earlier one's hold. Forward it is played from
  // there; backward it is played to there, and that frame is the earlier stop's rest frame again.
  const hold = timeline.holdFrames ?? 0;
  const startFrame = direction === 1 ? from + hold : from;
  const endFrame = direction === 1 ? target : target + hold;

  return {
    state: {
      ...state,
      moving: { from: state.stop, to, startFrame, endFrame, direction, phase },
    },
    start: true,
  };
}

/**
 * The frame to show while resting on a stop, `elapsedMs` after the rest began: the ride loops its
 * rest frames, so a station keeps moving while it waits; today's story stays on the stop's frame.
 */
export function restFrameAt(
  state: ControllerState,
  elapsedMs: number,
  fps: number,
  timeline: StoryTimeline,
): number {
  const frame = timeline.stopFrames[state.stop] ?? 0;
  const loop = timeline.restFrames ?? 0;
  if (loop <= 0) return frame;
  const played = Math.max(0, Math.floor((elapsedMs * fps) / 1000));
  return frame + (played % loop);
}

/**
 * How far ahead of its own frame the idle motion (smoke, Cell, a station's loop) should run at
 * `frame`. A tap can come anywhere in the rest loop, and the move's frames begin at the loop's
 * start: carrying the loop's phase into the move, and letting it go by the end, means nothing
 * jumps when the train sets off.
 */
export function idleOffset(state: ControllerState, frame: number): number {
  const move = state.moving;
  if (!move || move.phase === 0 || move.endFrame === move.startFrame) return 0;
  const done = (frame - move.startFrame) / (move.endFrame - move.startFrame);
  return move.phase * (1 - Math.max(0, Math.min(1, done)));
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

const LETTER_PAGE = /^letter-(\d+)$/;

/**
 * Where to rest after a format change rebuilds the stops. Stop ids, not indexes, carry over: the
 * letter's page count depends on the format, so the same index can point at another stop. A page
 * past the new count lands on the last page; anything else unknown keeps its index, clamped.
 */
export function carryStop(
  previousIds: readonly string[],
  previous: number,
  nextIds: readonly string[],
): number {
  const last = Math.max(0, nextIds.length - 1);
  const id = previousIds[previous];
  if (id !== undefined) {
    const same = nextIds.indexOf(id);
    if (same !== -1) return same;
    const page = LETTER_PAGE.exec(id)?.[1];
    if (page !== undefined) {
      const pages = nextIds.filter((next) => LETTER_PAGE.test(next)).length;
      const lastPage = nextIds.indexOf(`letter-${Math.min(Number(page), pages)}`);
      if (lastPage !== -1) return lastPage;
    }
  }
  return Math.min(Math.max(0, previous), last);
}
