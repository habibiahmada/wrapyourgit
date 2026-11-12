import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity } from "../city";
import { rideStops } from "./stops";
import {
  BUILD_SECONDS,
  buildFrames,
  buildProgress,
  buildRideTimeline,
  idleClock,
  trainAt,
} from "./timeline";

const stops = rideStops(sampleRecap, buildCity(sampleRecap));
const video = buildRideTimeline(stops, "video", 30);

test("video mode holds three seconds, interactive holds the rest loop", () => {
  expect(video.holdFrames).toBe(90);
  const web = buildRideTimeline(stops, "interactive", 30);
  expect(web.holdFrames).toBe(60);
  expect(web.restFrames).toBe(60);
  expect(video.restFrames).toBe(60);
});

test("moves take between 1.6 and 4.2 seconds", () => {
  expect(video.moveFrames[0]).toBe(0);
  video.moveFrames.slice(1).forEach((move, k) => {
    // The letter's time at the desk is part of the move into its first page, and the camera's
    // way back out part of the move away from its last: the ride itself is what is measured here.
    const stop = stops[k + 1];
    const prev = stops[k];
    const opens = stop?.kind === "letter" && (stop.page ?? 1) === 1;
    const closes = prev?.kind === "letter" && stop?.kind !== "letter";
    const ride = move - (opens ? video.letterIntro : 0) - (closes ? video.letterOutro : 0);
    // A later page of the letter turns in place: there is nothing to ride.
    if (stop?.kind === "letter" && !opens) {
      expect(ride).toBe(0);
      return;
    }
    expect(ride).toBeGreaterThanOrEqual(48);
    expect(ride).toBeLessThanOrEqual(126);
  });
  // The moves up to the overview and down from it take the longest time, however near the stops.
  const overview = stops.findIndex((stop) => stop.kind === "city");
  expect(video.moveFrames[overview]).toBe(126);
  expect(video.moveFrames[overview + 1]).toBe(126);
});

test("each stop comes one hold and one move after the last", () => {
  expect(video.stopFrames[0]).toBe(0);
  for (let i = 1; i < stops.length; i++) {
    expect(video.stopFrames[i]).toBe(
      (video.stopFrames[i - 1] ?? 0) + video.holdFrames + (video.moveFrames[i] ?? 0),
    );
  }
});

test("the train rests through a hold and arrives exactly on the stop's frame", () => {
  expect(trainAt(0, stops, video)).toBe(stops[0]?.s as number);
  expect(trainAt(video.holdFrames, stops, video)).toBe(stops[0]?.s as number);
  const arrive = video.stopFrames[2] ?? 0;
  expect(trainAt(arrive, stops, video)).toBe(stops[2]?.s as number);
  expect(trainAt(arrive + 40, stops, video)).toBe(stops[2]?.s as number);
});

test("the train only ever moves forward, and eases out of and into a stop", () => {
  let last = trainAt(0, stops, video);
  for (let f = 1; f < video.durationInFrames; f++) {
    const s = trainAt(f, stops, video);
    expect(s).toBeGreaterThanOrEqual(last);
    last = s;
  }
  const leave = video.holdFrames;
  const firstStep = trainAt(leave + 1, stops, video) - trainAt(leave, stops, video);
  const midStep = trainAt(leave + 30, stops, video) - trainAt(leave + 29, stops, video);
  expect(firstStep).toBeLessThan(midStep);
});

test("a hero has finished building on its stop's frame", () => {
  const f = video.stopFrames[2] ?? 0;
  expect(buildProgress(2, f, video, 30)).toBe(1);
  expect(buildProgress(2, f + 20, video, 30)).toBe(1);
  const frames = buildFrames(2, video, 30);
  expect(buildProgress(2, f - frames, video, 30)).toBe(0);
  expect(buildProgress(2, f - Math.round(frames / 2), video, 30)).toBeGreaterThan(0);
  expect(buildProgress(2, f - Math.round(frames / 2), video, 30)).toBeLessThan(1);
  expect(buildProgress(0, 0, video, 30)).toBe(1);
});

test("a hero takes long enough to watch, and never starts before the train has left", () => {
  video.stopFrames.forEach((stop, i) => {
    if (i === 0) return;
    const frames = buildFrames(i, video, 30);
    const move = video.moveFrames[i] ?? 0;
    // Well over a second where the move is long enough, and inside the move always.
    expect(frames).toBeLessThanOrEqual(Math.round(BUILD_SECONDS * 30));
    expect(frames).toBeLessThan(move);
    if (move >= 90) expect(frames).toBeGreaterThanOrEqual(60);
    // Still nothing built while the train rests at the stop before.
    const left = (video.stopFrames[i - 1] ?? 0) + video.holdFrames;
    expect(buildProgress(i, left, video, 30)).toBe(0);
    expect(buildProgress(i, stop, video, 30)).toBe(1);
  });
});

test("the duration ends one frame after the last hold", () => {
  expect(video.durationInFrames).toBe((video.stopFrames.at(-1) ?? 0) + video.holdFrames + 1);
});

test("the timeline keeps the shape the player and the slides read", () => {
  expect(video.stopFrames).toHaveLength(stops.length);
  expect(video.moveFrames).toHaveLength(stops.length);
  expect(video.inPlace).toEqual(stops.map(() => false));
});

test("the idle clock starts a fresh loop at every stop and never jumps on the way", () => {
  for (const mode of ["video", "interactive"] as const) {
    const t = buildRideTimeline(stops, mode, 30);
    for (const at of t.stopFrames) expect(idleClock(at, t)).toBe(0);
    // Through a hold it counts frames, so a rest loop is exact.
    const first = t.stopFrames[1] ?? 0;
    expect(idleClock(first + 37, t)).toBe(37);
    for (let frame = 0; frame < t.durationInFrames - 1; frame++) {
      // Idle motion repeats every 60 frames, so what must not jump is the phase.
      const step = (((idleClock(frame + 1, t) - idleClock(frame, t)) % 60) + 60) % 60;
      expect({ mode, frame, smooth: step > 0.4 && step < 2 }).toEqual({
        mode,
        frame,
        smooth: true,
      });
    }
  }
});

test("the train cruises: its top speed on a move is little more than its average", () => {
  // A month gate's sign has to be read as the train passes under it. Eased like a pendulum, the
  // train would cross the middle of a move at three times its average speed.
  video.stopFrames.slice(1).forEach((arrive, k) => {
    const move = video.moveFrames[k + 1] ?? 0;
    if (move === 0) return;
    const from = arrive - move;
    const distance = trainAt(arrive, stops, video) - trainAt(from, stops, video);
    let top = 0;
    for (let f = from; f < arrive; f++)
      top = Math.max(top, trainAt(f + 1, stops, video) - trainAt(f, stops, video));
    expect(top / (distance / move)).toBeLessThan(1.4);
  });
});
