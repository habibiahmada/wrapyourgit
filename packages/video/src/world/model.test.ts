import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { sampleRecap } from "../fixtures/sample-recap";
import { buildWorld, worldDuration } from "./model";

test("buildWorld: one camera per stop and a duration that covers the last stop", () => {
  const world = buildWorld(sampleRecap, VIDEO_FORMATS["9x16"], "interactive", 30);
  expect(world.cameras).toHaveLength(world.stops.length);
  expect(world.timeline.durationInFrames).toBe((world.timeline.stopFrames.at(-1) ?? 0) + 1);
});

test("worldDuration in video mode is longer than interactive by the holds", () => {
  const format = VIDEO_FORMATS["9x16"];
  const stops = buildWorld(sampleRecap, format, "video", 30).stops.length;
  const video = worldDuration(sampleRecap, format, "video");
  const interactive = worldDuration(sampleRecap, format, "interactive");
  expect(video - interactive).toBe(90 * stops);
});
