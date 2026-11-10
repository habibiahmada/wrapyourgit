import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { busyRecap, emptyRecap } from "../fixtures/edge-recaps";
import { sampleRecap } from "../fixtures/sample-recap";
import { type ExportFormat, exportFileName, slideFrames, worldExportComposition } from "./export";
import { buildWorld, worldDuration } from "./model";

const formats = Object.keys(VIDEO_FORMATS) as ExportFormat[];

test("compositions match the world's duration, size and id for every format and fixture", () => {
  for (const data of [sampleRecap, busyRecap, emptyRecap]) {
    for (const format of formats) {
      const c = worldExportComposition(data, format);
      expect(c.id).toBe(`world-${format}`);
      expect(c.width).toBe(VIDEO_FORMATS[format].width);
      expect(c.height).toBe(VIDEO_FORMATS[format].height);
      expect(c.fps).toBe(30);
      expect(c.durationInFrames).toBe(worldDuration(data, VIDEO_FORMATS[format], "video"));
      expect(c.defaultProps).toEqual({ data, mode: "video" });
    }
  }
});

test("one slide per 4:5 stop, each inside that stop's hold", () => {
  for (const data of [sampleRecap, busyRecap]) {
    const world = buildWorld(data, VIDEO_FORMATS["4x5"], "video", 30);
    const slides = slideFrames(data);
    expect(slides.length).toBe(world.stops.length);
    slides.forEach((slide, i) => {
      const arrival = world.timeline.stopFrames[i] ?? -1;
      expect(slide.stopId).toBe(world.stops[i]?.id ?? "");
      expect(slide.frame).toBeGreaterThan(arrival);
      expect(slide.frame).toBeLessThan(arrival + 90);
    });
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
