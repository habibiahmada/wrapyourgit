import { expect, test } from "bun:test";
import { cell, type Mood } from "./cell";
import { LIT } from "./palette";
import type { Box, Solid } from "./prims";

const tagged = (solids: Solid[], tag: string) =>
  solids.filter((s): s is Box => s.kind === "box" && s.tag === tag);
const body = (frame: number, mood: Mood) => tagged(cell([0, 0, 0], 0, frame, mood), "cell-body")[0];

test("Cell is the same 60 frames later in every mood", () => {
  for (const mood of ["ride", "idle", "cheer"] as const) {
    expect(cell([0, 0, 0], 0, 17, mood)).toEqual(cell([0, 0, 0], 0, 77, mood));
  }
});

test("Cell moves between frames: no rest frame is frozen", () => {
  expect(cell([0, 0, 0], 0, 5, "idle")).not.toEqual(cell([0, 0, 0], 0, 12, "idle"));
});

test("Cell blinks: its eyes lose their glint for four frames in sixty", () => {
  let closed = 0;
  for (let f = 0; f < 60; f++) {
    const glints = (body(f, "idle")?.decals ?? []).filter((d) => d.fill === "#ffffff");
    if (glints.length === 0) closed++;
  }
  expect(closed).toBe(4);
});

test("the face is on the front and nowhere else", () => {
  const faces = new Set(
    (body(10, "idle")?.decals ?? []).filter((d) => d.fill !== "#6ee787").map((d) => d.on),
  );
  expect([...faces]).toEqual(["front"]);
});

test("a cheer opens the mouth and raises both arms", () => {
  const arms = (mood: Mood) => tagged(cell([0, 0, 0], 0, 15, mood), "cell-arm").map((a) => a.at[2]);
  expect(arms("cheer")).toHaveLength(2);
  expect(Math.min(...arms("cheer"))).toBeGreaterThan(Math.max(...arms("idle")));
  const mouth = (mood: Mood) => {
    const decals = (body(15, mood)?.decals ?? []).filter(
      (d) => d.on === "front" && d.rect[1] < 0.4,
    );
    return Math.max(...decals.map((d) => d.rect[3] - d.rect[1]));
  };
  expect(mouth("cheer")).toBeGreaterThan(mouth("idle"));
});

test("Cell carries a pack on its back, so it reads from behind", () => {
  const pack = tagged(cell([0, 0, 0], 0, 0, "ride"), "cell-pack")[0];
  expect(pack?.decals?.some((d) => d.on === "back" && d.fill === LIT)).toBe(true);
});

test("Cell's eyes are open on the frames slides are taken from", () => {
  // A stop's slide is its rest frame, a multiple of the loop: a blink there would close Cell's
  // eyes in every exported picture.
  for (const f of [0, 1, 60, 61]) {
    expect((body(f, "idle")?.decals ?? []).some((d) => d.fill === "#ffffff")).toBe(true);
  }
});

test("Cell wears its crest: three cells of one size in an even row, darkest to brightest", () => {
  const crest = tagged(cell([0, 0, 0], 0, 0, "idle"), "cell-crest");
  expect(crest).toHaveLength(3);
  // One size and one height, so the row is level and balanced from every side.
  for (const one of crest) expect(one.size).toEqual(crest[0]?.size as Box["size"]);
  for (const one of crest) expect(one.at[2]).toBe(crest[0]?.at[2] as number);
  // Chunky, not a pillar: no taller than it is wide.
  expect(crest[0]?.size[2]).toBeLessThanOrEqual(crest[0]?.size[0] ?? 0);
  // Evenly spaced across the head, centred on it.
  const ys = crest.map((one) => one.at[1] + one.size[1] / 2);
  expect((ys[1] ?? 0) - (ys[0] ?? 0)).toBeCloseTo((ys[2] ?? 0) - (ys[1] ?? 0));
  expect(ys[1]).toBeCloseTo(0);
  // Each brighter than the last.
  const light = (hex: string) => Number.parseInt(hex.slice(3, 5), 16);
  const greens = crest.map((one) => light(one.tone.left));
  expect(greens[0]).toBeLessThan(greens[1] ?? 0);
  expect(greens[1]).toBeLessThan(greens[2] ?? 0);
});

test("Cell stands where it is put and turns as a whole", () => {
  const parts = cell([3, 4, 1], 0.7, 0, "idle").filter((s): s is Box => s.kind === "box");
  for (const p of parts) {
    expect(p.pivot).toEqual([3, 4]);
    expect(p.yaw).toBe(0.7);
    expect(p.at[2]).toBeGreaterThanOrEqual(1);
  }
});
