import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { busyRecap, emptyRecap, provisionalRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildRide, rideDuration, rideFrame } from "./model";
import { type Box, type Solid, scenePrims } from "./prims";

const f = VIDEO_FORMATS["16x9"];
const printed = (solids: Solid[]) =>
  solids.flatMap((s) => (s.kind === "box" ? (s.texts ?? []).map((t) => t.text) : []));
const tagged = (solids: Solid[], tag: string) =>
  solids.filter((s): s is Box => s.kind === "box" && s.tag === tag);

test("the ride has the player's timeline shape and a duration to match", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  expect(m.stops.map((s) => s.kind)).toEqual([
    "hello",
    "first-day",
    "city",
    "languages",
    "projects",
    "closing",
  ]);
  expect(m.timeline.stopFrames).toHaveLength(m.stops.length);
  expect(rideDuration(sampleRecap, f, "video")).toBe(m.timeline.durationInFrames);
  expect(m.gates).toHaveLength(12);
});

test("the same frame gives the same picture whatever was computed before it", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const alone = rideFrame(m, sampleRecap, 400, f, 30);
  rideFrame(m, sampleRecap, 12, f, 30);
  rideFrame(m, sampleRecap, 700, f, 30);
  expect(rideFrame(m, sampleRecap, 400, f, 30)).toEqual(alone);
});

test("a rest loop ends where it began", () => {
  // In a video the hold (3 s) is longer than the loop (2 s), so one loop on from a stop's frame
  // the train is still resting: that frame must be the stop's frame again. (On the web the frame
  // after the loop is the first frame of the move, and the player wraps before it.)
  const m = buildRide(sampleRecap, f, "video", 30);
  for (const stop of m.timeline.stopFrames) {
    expect(rideFrame(m, sampleRecap, stop + m.timeline.restFrames, f, 30)).toEqual(
      rideFrame(m, sampleRecap, stop, f, 30),
    );
  }
});

test("a station is alive at rest: the picture changes inside the loop", () => {
  const m = buildRide(sampleRecap, f, "interactive", 30);
  const stop = m.timeline.stopFrames[2] ?? 0;
  expect(rideFrame(m, sampleRecap, stop + 7, f, 30).objects).not.toEqual(
    rideFrame(m, sampleRecap, stop, f, 30).objects,
  );
});

test("every station has finished building on its stop's frame", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  m.stops.forEach((_, i) => {
    const at = m.timeline.stopFrames[i] ?? 0;
    expect(printed(rideFrame(m, sampleRecap, at, f, 30).objects)).toEqual(
      printed(rideFrame(m, sampleRecap, at + 30, f, 30).objects),
    );
  });
});

test("the train and Cell are in every frame's picture", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  for (const at of [0, 100, 300, 500, m.timeline.durationInFrames - 1]) {
    const objects = rideFrame(m, sampleRecap, at, f, 30).objects;
    expect(tagged(objects, "engine").length).toBeGreaterThan(0);
    expect(tagged(objects, "cell-body")).toHaveLength(1);
  }
});

test("Cell turns to the camera at a station and faces forward on the ride", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const i = m.stops.findIndex((s) => s.kind === "languages");
  const at = m.timeline.stopFrames[i] ?? 0;
  const yaw = (frame: number) =>
    tagged(rideFrame(m, sampleRecap, frame, f, 30).objects, "cell-body")[0]?.yaw ?? 0;
  const riding = at - Math.round((m.timeline.moveFrames[i] ?? 0) / 2);
  expect(Math.abs(yaw(at) - yaw(riding))).toBeGreaterThan(1);
});

test("Cell's eyes are open on every stop's frame, whatever the timing", () => {
  for (const data of [sampleRecap, busyRecap, provisionalRecap]) {
    const m = buildRide(data, f, "video", 30);
    for (const at of m.timeline.stopFrames) {
      for (const frame of [at, at + 1]) {
        const body = tagged(rideFrame(m, data, frame, f, 30).objects, "cell-body")[0];
        expect((body?.decals ?? []).some((d) => d.fill === "#ffffff")).toBe(true);
      }
    }
  }
});

test("Cell does not snap as the train arrives or leaves", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const arm = (frame: number) =>
    Math.max(
      ...tagged(rideFrame(m, sampleRecap, frame, f, 30).objects, "cell-arm").map((a) => a.at[2]),
    );
  m.timeline.stopFrames.slice(1).forEach((at) => {
    expect(Math.abs(arm(at) - arm(at - 1))).toBeLessThan(0.06);
    const leave = at + m.timeline.holdFrames;
    expect(Math.abs(arm(leave + 1) - arm(leave))).toBeLessThan(0.06);
  });
});

test("the ride builds for every fixture and format", () => {
  for (const data of [sampleRecap, emptyRecap, busyRecap, provisionalRecap]) {
    for (const format of Object.values(VIDEO_FORMATS)) {
      const m = buildRide(data, format, "video", 30);
      for (const stop of m.timeline.stopFrames) {
        expect(() => rideFrame(m, data, stop, format, 30)).not.toThrow();
      }
    }
  }
});

test("a frame stays inside the polygon budget", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const frames = m.timeline.stopFrames.flatMap((stop, i) => [
    stop,
    stop - Math.round((m.timeline.moveFrames[i] ?? 0) / 2),
  ]);
  for (const at of frames) {
    const { cam, fog, ground, objects } = rideFrame(m, sampleRecap, Math.max(0, at), f, 30);
    const count = scenePrims(ground, cam, f, fog).length + scenePrims(objects, cam, f, fog).length;
    expect({ at, ok: count < 4000 }).toEqual({ at, ok: true });
  }
});
