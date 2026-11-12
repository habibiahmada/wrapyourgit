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

test("Cell wears its crest: one box painted as three even cells, darkest to brightest", () => {
  const crest = tagged(cell([0, 0, 0], 0, 0, "idle"), "cell-crest");
  // One box, so no cell can be painted over its neighbour whichever way Cell turns.
  expect(crest).toHaveLength(1);
  const box = crest[0] as Box;
  // Centred across the head, and chunky: each cell is no taller than it is wide.
  expect(box.at[1] + box.size[1] / 2).toBeCloseTo(0);
  expect(box.size[2]).toBeLessThanOrEqual(box.size[1] / 3);
  const green = (hex: string) => Number.parseInt(hex.slice(3, 5), 16);
  const cells = (on: string) =>
    (box.decals ?? []).filter((d) => d.on === on && d.fill !== "#0e4429").map((d) => d);
  // The top is cut in three equal parts along the row, each brighter than the last.
  const top = cells("top").sort((a, b) => a.rect[1] - b.rect[1]);
  expect(top).toHaveLength(3);
  for (const part of top) expect(part.rect[3] - part.rect[1]).toBeCloseTo(1 / 3);
  expect(green(top[0]?.fill ?? "")).toBeLessThan(green(top[1]?.fill ?? ""));
  expect(green(top[1]?.fill ?? "")).toBeLessThan(green(top[2]?.fill ?? ""));
  // The back face runs the other way round, so the dark cell is at the same end on both sides.
  const front = cells("front").sort((a, b) => a.rect[0] - b.rect[0]);
  const back = cells("back").sort((a, b) => a.rect[0] - b.rect[0]);
  expect(green(front[0]?.fill ?? "")).toBeLessThan(green(front[2]?.fill ?? ""));
  expect(green(back[0]?.fill ?? "")).toBeGreaterThan(green(back[2]?.fill ?? ""));
});

test("Cell stands where it is put and turns as a whole", () => {
  const parts = cell([3, 4, 1], 0.7, 0, "idle").filter((s): s is Box => s.kind === "box");
  for (const p of parts) {
    expect(p.pivot).toEqual([3, 4]);
    expect(p.yaw).toBe(0.7);
    expect(p.at[2]).toBeGreaterThanOrEqual(1);
  }
});
