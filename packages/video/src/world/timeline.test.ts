import { expect, test } from "bun:test";
import type { Camera } from "./camera";
import { buildTimeline } from "./timeline";

const cameras: Camera[] = [
  { x: 0, y: 0, span: 2.4 },
  { x: 1, y: 0.5, span: 2.4 },
  { x: 200, y: 90, span: 60 },
  { x: -30, y: 4, span: 2.4 },
];

test("moves last between 1.1 s and 2 s at 30 fps", () => {
  const tl = buildTimeline(cameras, "interactive", 30);
  expect(tl.moveFrames[0]).toBe(0);
  for (const m of tl.moveFrames.slice(1)) {
    expect(m).toBeGreaterThanOrEqual(33);
    expect(m).toBeLessThanOrEqual(60);
  }
});

test("interactive mode rests stop 0 on frame 0 and each stop on the end of its move", () => {
  const tl = buildTimeline(cameras, "interactive", 30);
  expect(tl.stopFrames[0]).toBe(0);
  for (let i = 1; i < cameras.length; i++) {
    expect(tl.stopFrames[i]).toBe((tl.stopFrames[i - 1] ?? 0) + (tl.moveFrames[i] ?? 0));
  }
  expect(tl.durationInFrames).toBe((tl.stopFrames.at(-1) ?? 0) + 1);
});

test("video mode holds each stop for 3 s, interactive mode does not", () => {
  const interactive = buildTimeline(cameras, "interactive", 30);
  const video = buildTimeline(cameras, "video", 30);
  expect(video.durationInFrames).toBe(interactive.durationInFrames + 90 * cameras.length);
  expect(video.moveFrames).toEqual(interactive.moveFrames);
});

test("buildTimeline: identical cameras alone don't make a stop in place; the caller says so", () => {
  const cam = { x: 3, y: 4, span: 2 };
  expect(buildTimeline([cam, cam, cam], "interactive", 30).inPlace).toEqual([false, false, false]);
  expect(buildTimeline([cam, cam, cam], "interactive", 30, [false, false, true]).inPlace).toEqual([
    false,
    false,
    true,
  ]);
});
