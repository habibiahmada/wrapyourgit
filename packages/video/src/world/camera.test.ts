import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { sampleRecap } from "../fixtures/sample-recap";
import type { Camera } from "./camera";
import { cameraAt, PLOT_SPAN, project, stopCamera } from "./camera";
import { buildCity, isoPoint, plotHeight, TILE_H, TILE_W } from "./city";
import { buildStops } from "./stops";
import { buildTimeline } from "./timeline";

const FRAME = { width: 1080, height: 1080 };

test("a plot stop centres on the top of its building", () => {
  const city = buildCity(sampleRecap);
  const stop = { id: "busiest", kind: "busiest", plot: city.busiestIndex } as const;
  const plot = city.plots[city.busiestIndex ?? 0];
  if (!plot) throw new Error("no busiest plot");
  const cam = stopCamera(stop, city, FRAME);
  const base = isoPoint(plot.col, plot.row);
  expect(cam.span).toBe(PLOT_SPAN);
  expect(cam.x).toBeCloseTo(base.x);
  expect(cam.y).toBeCloseTo(base.y - plotHeight(plot, city.maxCount));
});

test("the city stop frames the whole city in every format", () => {
  const city = buildCity(sampleRecap);
  const stop = buildStops(sampleRecap, city, { letterPages: 1 }).find((s) => s.kind === "city");
  if (!stop) throw new Error("no city stop");
  for (const frame of Object.values(VIDEO_FORMATS)) {
    const cam = stopCamera(stop, city, frame);
    for (const plot of city.plots) {
      const { x, y } = isoPoint(plot.col, plot.row);
      const top = plotHeight(plot, city.maxCount);
      const corners = [
        { x: x - TILE_W, y },
        { x: x + TILE_W, y },
        { x, y: y - top },
        { x, y: y + TILE_H },
      ];
      for (const corner of corners) {
        const p = project(corner, cam, frame);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(frame.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(frame.height);
      }
    }
  }
});

test("project puts the camera centre in the middle of the frame", () => {
  const p = project({ x: 3, y: 4 }, { x: 3, y: 4, span: 2 }, { width: 1920, height: 1080 });
  expect(p).toEqual({ x: 960, y: 540 });
});

test("the camera rests exactly on each stop's frame", () => {
  const cameras: Camera[] = [
    { x: 0, y: 0, span: 2.4 },
    { x: 5, y: 2, span: 10 },
    { x: 1, y: 1, span: 2.4 },
  ];
  for (const mode of ["interactive", "video"] as const) {
    const tl = buildTimeline(cameras, mode, 30);
    cameras.forEach((cam, i) => {
      const at = cameraAt(tl.stopFrames[i] ?? 0, cameras, tl);
      expect(at.x).toBeCloseTo(cam.x, 9);
      expect(at.y).toBeCloseTo(cam.y, 9);
      expect(at.span).toBeCloseTo(cam.span, 9);
    });
  }
});

test("zoom is log-linear: halfway between span 1 and span 4 is span 2 when there is no hop", () => {
  const cameras: Camera[] = [
    { x: 0, y: 0, span: 1 },
    { x: 0, y: 0, span: 4 },
  ];
  const tl = buildTimeline(cameras, "interactive", 30);
  const mid = (tl.stopFrames[1] ?? 0) - (tl.moveFrames[1] ?? 0) / 2;
  expect(cameraAt(mid, cameras, tl).span).toBeCloseTo(2, 9);
});

test("a long hop between two close-ups zooms out mid-flight and lands back in", () => {
  const cameras: Camera[] = [
    { x: 0, y: 0, span: PLOT_SPAN },
    { x: 40, y: 10, span: PLOT_SPAN },
  ];
  const tl = buildTimeline(cameras, "interactive", 30);
  let max = 0;
  for (let f = 0; f <= tl.durationInFrames; f++) max = Math.max(max, cameraAt(f, cameras, tl).span);
  expect(max).toBeGreaterThan(PLOT_SPAN * 2);
  expect(cameraAt(tl.stopFrames[1] ?? 0, cameras, tl).span).toBeCloseTo(PLOT_SPAN, 9);
});

test("cameraAt is deterministic and clamps outside the timeline", () => {
  const cameras: Camera[] = [
    { x: 0, y: 0, span: 2.4 },
    { x: 9, y: 3, span: 20 },
  ];
  const tl = buildTimeline(cameras, "video", 30);
  expect(cameraAt(-5, cameras, tl)).toEqual(cameras[0] as Camera);
  expect(cameraAt(1e6, cameras, tl)).toEqual(cameras[1] as Camera);
  expect(cameraAt(40, cameras, tl)).toEqual(cameraAt(40, cameras, tl));
});
