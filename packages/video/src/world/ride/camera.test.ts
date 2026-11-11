import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { sampleRecap } from "../../fixtures/sample-recap";
import { buildCity } from "../city";
import { middleShot, restCamera, rideCamera, SHOTS } from "./camera";
import { projectPoint } from "./project";
import { type RideStop, rideStops } from "./stops";
import { buildRideTimeline } from "./timeline";
import { at, FIRST_PLATFORM, heading } from "./track";

const stops = rideStops(sampleRecap, buildCity(sampleRecap));
const t = buildRideTimeline(stops, "video", 30);
const landscape = { width: 1920, height: 1080 };
const stopOf = (kind: string) => stops.findIndex((s) => s.kind === kind);

test("the shots are the ones the spec names", () => {
  expect(SHOTS.RIDE).toMatchObject({ radius: 4.6, height: 2.4, fov: 56, look: "ahead" });
  expect(SHOTS.ISO).toMatchObject({ radius: 19.5, height: 11.3, look: "hero" });
  expect(SHOTS.RIDE.theta).toBeCloseTo(Math.PI);
  expect(SHOTS.ISO.theta).toBeCloseTo(Math.PI * 0.75);
});

test("the camera does not move during a hold", () => {
  const f = t.stopFrames[stopOf("languages")] ?? 0;
  expect(rideCamera(f + 1, stops, t, landscape)).toEqual(rideCamera(f + 45, stops, t, landscape));
  expect(rideCamera(f, stops, t, landscape).roll).toBe(0);
  expect(rideCamera(f, stops, t, landscape).riding).toBe(false);
});

test("a station's rest frame is the rest camera", () => {
  const i = stopOf("languages");
  const rest = restCamera(stops[i] as RideStop, stops, landscape);
  const cam = rideCamera(t.stopFrames[i] ?? 0, stops, t, landscape).cam;
  for (const k of [0, 1, 2] as const) {
    expect(cam.pos[k]).toBeCloseTo(rest.pos[k]);
    expect(cam.look[k]).toBeCloseTo(rest.look[k]);
  }
  expect(cam.fov).toBeCloseTo(rest.fov);
});

test("the camera sits across the rail from the plaza", () => {
  for (const stop of stops.filter((s) => s.plaza)) {
    const cam = restCamera(stop, stops, landscape);
    const rail = at(stop.s);
    const h = heading(stop.s);
    const lateral = (cam.pos[0] - rail[0]) * Math.sin(h) - (cam.pos[1] - rail[1]) * Math.cos(h);
    expect(Math.sign(lateral)).toBe(-stop.side);
  }
});

test("hello rests in front of the engine, not behind it", () => {
  const cam = restCamera(stops[0] as RideStop, stops, landscape);
  const rail = at(FIRST_PLATFORM);
  const h = heading(FIRST_PLATFORM);
  const ahead = (cam.pos[0] - rail[0]) * Math.cos(h) + (cam.pos[1] - rail[1]) * Math.sin(h);
  expect(ahead).toBeGreaterThan(0);
});

test("the camera never jumps", () => {
  let prev = rideCamera(0, stops, t, landscape).cam;
  for (let f = 1; f < t.durationInFrames; f++) {
    const cam = rideCamera(f, stops, t, landscape).cam;
    const moved = Math.hypot(
      cam.pos[0] - prev.pos[0],
      cam.pos[1] - prev.pos[1],
      cam.pos[2] - prev.pos[2],
    );
    const looked = Math.hypot(
      cam.look[0] - prev.look[0],
      cam.look[1] - prev.look[1],
      cam.look[2] - prev.look[2],
    );
    expect({ f, moved: moved < 4, looked: looked < 2.5 }).toEqual({ f, moved: true, looked: true });
    prev = cam;
  }
});

test("the camera rides behind Cell in the middle of a long move", () => {
  const i = stopOf("projects");
  const mid = (t.stopFrames[i] ?? 0) - Math.round((t.moveFrames[i] ?? 0) * 0.5);
  const all = Array.from({ length: t.moveFrames[i] ?? 0 }, (_, k) =>
    rideCamera((t.stopFrames[i] ?? 0) - k, stops, t, landscape),
  );
  expect(all.some((c) => c.riding)).toBe(true);
  expect(rideCamera(mid, stops, t, landscape).speed).toBeGreaterThan(0);
});

test("middle shots alternate and short moves have none", () => {
  expect(middleShot(1, 3)).not.toBe(middleShot(2, 3));
  expect(middleShot(1, 3)).not.toBeNull();
  expect(middleShot(1, 1.8)).toBeNull();
});

test("the city shot holds the whole rail in every format", () => {
  const i = stopOf("city");
  const end = (stops.at(-1)?.s ?? 0) + 4;
  for (const format of Object.values(VIDEO_FORMATS)) {
    const cam = restCamera(stops[i] as RideStop, stops, format);
    for (const p of [at(FIRST_PLATFORM), at(end)]) {
      const s = projectPoint(p, cam, format);
      expect(s).not.toBeNull();
      expect(s?.[0] ?? -1).toBeGreaterThan(0);
      expect(s?.[0] ?? 1e9).toBeLessThan(format.width);
      expect(s?.[1] ?? -1).toBeGreaterThan(0);
      expect(s?.[1] ?? 1e9).toBeLessThan(format.height);
    }
  }
});

test("the same frame gives the same camera", () => {
  expect(rideCamera(333, stops, t, landscape)).toEqual(rideCamera(333, stops, t, landscape));
});
