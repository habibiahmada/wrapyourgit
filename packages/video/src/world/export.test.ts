import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { busyRecap, emptyRecap } from "../fixtures/edge-recaps";
import { sampleRecap } from "../fixtures/sample-recap";
import { type ExportFormat, exportFileName, slideFrames, worldExportComposition } from "./export";
import { videoSounds } from "./model";
import { buildRide, rideDuration } from "./ride/model";

const formats = Object.keys(VIDEO_FORMATS) as ExportFormat[];

test("compositions match the ride's duration, size and id for every format and fixture", () => {
  for (const data of [sampleRecap, busyRecap, emptyRecap]) {
    for (const format of formats) {
      const c = worldExportComposition(data, format);
      expect(c.id).toBe(`ride-${format}`);
      expect(c.width).toBe(VIDEO_FORMATS[format].width);
      expect(c.height).toBe(VIDEO_FORMATS[format].height);
      expect(c.fps).toBe(30);
      expect(c.durationInFrames).toBe(rideDuration(data, VIDEO_FORMATS[format], "video"));
      expect(c.defaultProps).toEqual({ data, mode: "video" });
    }
  }
});

test("one slide per 4:5 stop, each on the stop's rest frame, where every figure is exact", () => {
  for (const data of [sampleRecap, busyRecap]) {
    const ride = buildRide(data, VIDEO_FORMATS["4x5"], "video", 30);
    const slides = slideFrames(data);
    expect(slides.length).toBe(ride.stops.length);
    slides.forEach((slide, i) => {
      expect(slide.stopId).toBe(ride.stops[i]?.id ?? "");
      expect(slide.frame).toBe(ride.timeline.stopFrames[i] ?? -1);
    });
  }
});

test("the ride's video has its sounds: a travel sound where each move starts, an arrival at each stop", () => {
  const ride = buildRide(sampleRecap, VIDEO_FORMATS["9x16"], "video", 30);
  const sounds = videoSounds(ride);
  const { stopFrames, holdFrames } = ride.timeline;
  // The move into the first-day stop starts when the hold at hello ends.
  const firstDay = ride.stops.findIndex((stop) => stop.kind === "first-day");
  expect(sounds).toContainEqual({
    frame: (stopFrames[firstDay - 1] ?? 0) + holdFrames,
    sound: "rails",
    frames: ride.timeline.moveFrames[firstDay] ?? -1,
  });
  expect(sounds).toContainEqual({ frame: stopFrames[firstDay] ?? -1, sound: "sprout" });
  expect(sounds.filter((s) => s.sound === "firework")).toHaveLength(1);
});

test("the default composition's props are only data and mode, as before the letter option", () => {
  expect(Object.keys(worldExportComposition(sampleRecap, "9x16").defaultProps)).toEqual([
    "data",
    "mode",
  ]);
});

test("without the letter: the composition matches the ride without it and says so in its props", () => {
  for (const data of [sampleRecap, busyRecap, emptyRecap]) {
    for (const format of formats) {
      const c = worldExportComposition(data, format, { letter: false });
      const bare = rideDuration(data, VIDEO_FORMATS[format], "video", { letter: false });
      expect(c.durationInFrames).toBe(bare);
      expect(bare).toBeLessThan(rideDuration(data, VIDEO_FORMATS[format], "video"));
      expect(c.defaultProps).toEqual({ data, mode: "video", letter: false });
    }
  }
});

test("without the letter: no letter slides, one slide per remaining 4:5 stop", () => {
  for (const data of [sampleRecap, busyRecap]) {
    const ride = buildRide(data, VIDEO_FORMATS["4x5"], "video", 30, { letter: false });
    const slides = slideFrames(data, { letter: false });
    expect(slides.some((slide) => slide.stopId.startsWith("letter"))).toBe(false);
    expect(slides.map((slide) => slide.stopId)).toEqual(ride.stops.map((stop) => stop.id));
    expect(slideFrames(data).some((slide) => slide.stopId.startsWith("letter"))).toBe(true);
  }
});

test("file names for each kind, zero-padded index, login sanitised", () => {
  const data = { ...sampleRecap, profile: { ...sampleRecap.profile, login: "Octo_Cat.X" } };
  const base = `wrapyourgit-${data.meta.year}-octo-cat-x`;
  expect(exportFileName("mp4", data, { format: "9x16" })).toBe(`${base}-9x16.mp4`);
  expect(exportFileName("png", data, { index: 3, stopId: "letter-1" })).toBe(
    `${base}-03-letter-1.png`,
  );
  expect(exportFileName("zip", data)).toBe(`${base}-slides.zip`);
  expect(exportFileName("pdf", data)).toBe(`${base}.pdf`);
});
