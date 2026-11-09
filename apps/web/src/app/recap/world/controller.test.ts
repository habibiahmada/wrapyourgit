import { expect, test } from "bun:test";
import type { Timeline } from "@wyg/video/world";
import { type ControllerState, frameAt, initialState, request, settle } from "./controller";

const timeline: Timeline = {
  stopFrames: [0, 100, 250, 400],
  moveFrames: [0, 100, 150, 150],
  durationInFrames: 400,
};

function atStop(stop: number): ControllerState {
  return { stop, moving: null, queued: null };
}

test("forward from stop 0 moves to stop 1 over its move frames", () => {
  const r = request(initialState(), 1, timeline);
  expect(r.start).toBe(true);
  expect(r.state.moving).toEqual({ from: 0, to: 1, startFrame: 0, endFrame: 100, direction: 1 });
});

test("backward plays the same frames in reverse", () => {
  const r = request(atStop(2), -1, timeline);
  expect(r.start).toBe(true);
  expect(r.state.moving).toEqual({ from: 2, to: 1, startFrame: 250, endFrame: 100, direction: -1 });
  expect(frameAt(r.state, 0, 30)).toBe(250);
  expect(frameAt(r.state, 1000, 30)).toBe(220);
  expect(frameAt(r.state, 1000, 30)).toBeLessThan(frameAt(r.state, 500, 30));
});

test("nothing happens before the first stop or after the last", () => {
  const first = atStop(0);
  const last = atStop(3);
  expect(request(first, -1, timeline)).toEqual({ state: first, start: false });
  expect(request(last, 1, timeline)).toEqual({ state: last, start: false });
});

test("taps during a move queue one direction, the last one wins", () => {
  const started = request(initialState(), 1, timeline).state;
  const a = request(started, 1, timeline);
  const b = request(a.state, -1, timeline);
  expect(a.start).toBe(false);
  expect(b.start).toBe(false);
  expect(b.state.queued).toBe(-1);
  expect(b.state.moving).toEqual(started.moving);
});

test("settle rests on the target and returns the queued move", () => {
  const moving = request(initialState(), 1, timeline).state;
  const queued = request(moving, 1, timeline).state;
  const done = settle(queued);
  expect(done.next).toBe(1);
  expect(done.state).toEqual({ stop: 1, moving: null, queued: null });
  expect(settle(moving).next).toBeNull();
});

test("frameAt never passes the end frame", () => {
  const fwd = request(initialState(), 1, timeline).state;
  const back = request(atStop(2), -1, timeline).state;
  expect(frameAt(fwd, 1_000_000, 30)).toBe(100);
  expect(frameAt(back, 1_000_000, 30)).toBe(100);
});

test("frameAt returns whole frames", () => {
  const fwd = request(initialState(), 1, timeline).state;
  expect(frameAt(fwd, 100, 30)).toBe(3);
});
