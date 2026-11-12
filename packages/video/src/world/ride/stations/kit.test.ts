import { expect, test } from "bun:test";
import { sampleRecap } from "../../../fixtures/sample-recap";
import { buildCity } from "../../city";
import type { Box, Solid } from "../prims";
import { rideStops } from "../stops";
import { at, PLAZA_AHEAD } from "../track";
import { board, clip, plaza, stationContext } from "./kit";

const texts = (solids: Solid[], on: string) =>
  solids.flatMap((s) =>
    s.kind === "box" ? (s.texts ?? []).filter((t) => t.on === on).map((t) => t.text) : [],
  );

test("clip keeps short names and cuts long ones with an ellipsis", () => {
  expect(clip("trailmix", 16)).toBe("trailmix");
  expect(clip("an-extremely-long-repository", 16)).toBe("an-extremely-lo…");
  expect(clip("an-extremely-long-repository", 16)).toHaveLength(16);
});

test("a board prints its lines on both faces across the rail", () => {
  const b = board([0, 0, 0], 0, 0, 0, 4, ["Top languages", "Mostly TypeScript"]);
  expect(texts(b, "front")).toEqual(["Top languages", "Mostly TypeScript"]);
  expect(texts(b, "back")).toEqual(["Top languages", "Mostly TypeScript"]);
});

test("a board along the rail prints on its two long faces", () => {
  const b = board([0, 0, 0], 0, 0, 0, 4, ["A"], "along");
  expect(texts(b, "left")).toEqual(["A"]);
  expect(texts(b, "right")).toEqual(["A"]);
  expect(texts(b, "front")).toEqual([]);
});

test("a board leaves out empty lines", () => {
  expect(texts(board([0, 0, 0], 0, 0, 0, 4, ["A", "", "B"]), "back")).toEqual(["A", "B"]);
});

test("a board's lines do not overlap", () => {
  const sign = board([0, 0, 0], 0, 0, 0, 4, ["A", "B", "C"]).find(
    (s): s is Box => s.kind === "box" && (s.texts?.length ?? 0) > 0,
  );
  const rects = (sign?.texts ?? []).filter((t) => t.on === "back").map((t) => t.rect);
  for (let i = 1; i < rects.length; i++) {
    expect(rects[i]?.[3] ?? 1).toBeLessThanOrEqual(rects[i - 1]?.[1] ?? 0);
  }
  for (const r of rects) {
    expect(r[1]).toBeGreaterThanOrEqual(0);
    expect(r[3]).toBeLessThanOrEqual(1);
  }
});

test("a plaza stop's context is centred on its plaza, across the rail from the camera", () => {
  const city = buildCity(sampleRecap);
  const stops = rideStops(sampleRecap, city);
  const stop = stops.find((s) => s.kind === "languages");
  if (!stop) throw new Error("no stop");
  const ctx = stationContext(sampleRecap, city, stop, 1, 0, 0);
  expect(ctx.c).toEqual(at(stop.s + PLAZA_AHEAD, stop.side * 8));
  const slab = plaza(ctx).find((s): s is Box => s.kind === "box" && s.tag === "plaza");
  expect(slab?.size).toEqual([9.6, 4.8, 0.25]);
});

test("a stop without a plaza is centred on the train", () => {
  const city = buildCity(sampleRecap);
  const stop = rideStops(sampleRecap, city)[0];
  if (!stop) throw new Error("no stop");
  expect(stationContext(sampleRecap, city, stop, 1, 0, 0).c).toEqual(at(stop.s));
});
