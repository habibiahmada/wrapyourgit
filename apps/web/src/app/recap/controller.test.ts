import { describe, expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { sampleRecap } from "@wyg/video";
import { buildWorld, type Timeline } from "@wyg/video/world";
import {
  type ControllerState,
  carryStop,
  frameAt,
  idleOffset,
  initialState,
  request,
  restFrameAt,
  settle,
} from "./controller";

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
  expect(r.state.moving).toEqual({
    from: 0,
    to: 1,
    startFrame: 0,
    endFrame: 100,
    direction: 1,
    phase: 0,
  });
});

test("backward plays the same frames in reverse", () => {
  const r = request(atStop(2), -1, timeline);
  expect(r.start).toBe(true);
  expect(r.state.moving).toEqual({
    from: 2,
    to: 1,
    startFrame: 250,
    endFrame: 100,
    direction: -1,
    phase: 0,
  });
  expect(frameAt(r.state, 0, 30)).toBe(250);
  expect(frameAt(r.state, 1000, 30)).toBe(220);
  const early = frameAt(r.state, 500, 30);
  expect(early).not.toBeNull();
  expect(frameAt(r.state, 1000, 30) as number).toBeLessThan(early as number);
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

test("frameAt is null while the camera rests", () => {
  expect(frameAt(initialState(), 500, 30)).toBeNull();
});

test("a negative elapsed time never goes before the start frame", () => {
  const back = request(atStop(2), -1, timeline).state;
  expect(frameAt(back, -50, 30)).toBe(250);
});

test("settle on a resting state keeps the stop and returns no move", () => {
  expect(settle(atStop(2))).toEqual({ state: atStop(2), next: null });
});

/** The ride's shape: each stop holds one rest loop of 60 frames before the train leaves. */
const ride: Timeline & { holdFrames: number; restFrames: number } = {
  stopFrames: [0, 160, 310],
  moveFrames: [0, 100, 90],
  durationInFrames: 371,
  holdFrames: 60,
  restFrames: 60,
};

test("on the ride a move starts after the stop's hold and ends on the next stop's frame", () => {
  const r = request(initialState(), 1, ride);
  expect(r.state.moving).toMatchObject({ startFrame: 60, endFrame: 160 });
});

test("back on the ride plays the same move in reverse, ending where the hold ends", () => {
  const r = request(atStop(2), -1, ride);
  expect(r.state.moving).toMatchObject({ startFrame: 310, endFrame: 220 });
});

test("at rest the ride loops through the stop's rest frames", () => {
  expect(restFrameAt(atStop(1), 0, 30, ride)).toBe(160);
  expect(restFrameAt(atStop(1), 1000, 30, ride)).toBe(190);
  // Two seconds is one whole loop: back at the stop's frame.
  expect(restFrameAt(atStop(1), 2000, 30, ride)).toBe(160);
  expect(restFrameAt(atStop(1), 2500, 30, ride)).toBe(175);
});

test("a story without rest loops stays on the stop's frame", () => {
  expect(restFrameAt(atStop(2), 1234, 30, timeline)).toBe(250);
});

test("a move started part way through the rest loop carries that phase, and lets it go by arrival", () => {
  const r = request(atStop(1), 1, ride, 24).state;
  expect(r.moving?.phase).toBe(24);
  expect(idleOffset(r, 220)).toBe(24);
  expect(idleOffset(r, 310)).toBe(0);
  const half = idleOffset(r, 265);
  expect(half).toBeGreaterThan(0);
  expect(half).toBeLessThan(24);
  // The same backwards: the phase is let go by the frame the move ends on.
  const back = request(atStop(2), -1, ride, 24).state;
  expect(idleOffset(back, 310)).toBe(24);
  expect(idleOffset(back, 220)).toBe(0);
  expect(idleOffset(atStop(1), 160)).toBe(0);
});

describe("carryStop: the stop to rest on after a format change", () => {
  const ids = (format: keyof typeof VIDEO_FORMATS) =>
    buildWorld(sampleRecap, VIDEO_FORMATS[format], "interactive", 30).stops.map((s) => s.id);
  const tall = ids("9x16");
  const wide = ids("16x9");

  test("the formats really differ in letter pages", () => {
    expect(wide.length).toBeGreaterThan(tall.length);
  });

  test("closing stays closing both ways", () => {
    expect(wide[carryStop(tall, tall.indexOf("closing"), wide)]).toBe("closing");
    expect(tall[carryStop(wide, wide.indexOf("closing"), tall)]).toBe("closing");
  });

  test("a stop present in both keeps its id", () => {
    expect(tall[carryStop(wide, wide.indexOf("versus"), tall)]).toBe("versus");
    expect(tall[carryStop(wide, wide.indexOf("letter-2"), tall)]).toBe("letter-2");
  });

  test("a letter page past the new page count lands on the last page", () => {
    const pages = tall.filter((id) => id.startsWith("letter-")).length;
    expect(tall[carryStop(wide, wide.indexOf("letter-5"), tall)]).toBe(`letter-${pages}`);
  });

  test("an unknown stop clamps its index into the new list", () => {
    expect(carryStop(["a", "b", "c"], 2, ["x", "y"])).toBe(1);
    expect(carryStop(["a"], 0, ["x", "y"])).toBe(0);
  });
});
