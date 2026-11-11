import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity } from "../city";
import { rideStops } from "./stops";
import { buildProgress, buildRideTimeline, trainAt } from "./timeline";

const stops = rideStops(sampleRecap, buildCity(sampleRecap));
const video = buildRideTimeline(stops, "video", 30);

test("video mode holds three seconds, interactive holds the rest loop", () => {
  expect(video.holdFrames).toBe(90);
  const web = buildRideTimeline(stops, "interactive", 30);
  expect(web.holdFrames).toBe(60);
  expect(web.restFrames).toBe(60);
  expect(video.restFrames).toBe(60);
});

test("moves take between 1.6 and 3.2 seconds", () => {
  expect(video.moveFrames[0]).toBe(0);
  for (const move of video.moveFrames.slice(1)) {
    expect(move).toBeGreaterThanOrEqual(48);
    expect(move).toBeLessThanOrEqual(96);
  }
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
  expect(buildProgress(2, f - 36, video, 30)).toBe(0);
  expect(buildProgress(2, f - 18, video, 30)).toBeGreaterThan(0);
  expect(buildProgress(2, f - 18, video, 30)).toBeLessThan(1);
  expect(buildProgress(0, 0, video, 30)).toBe(1);
});

test("the duration ends one frame after the last hold", () => {
  expect(video.durationInFrames).toBe((video.stopFrames.at(-1) ?? 0) + video.holdFrames + 1);
});

test("the timeline keeps the shape the player and the slides read", () => {
  expect(video.stopFrames).toHaveLength(stops.length);
  expect(video.moveFrames).toHaveLength(stops.length);
  expect(video.inPlace).toEqual(stops.map(() => false));
});
