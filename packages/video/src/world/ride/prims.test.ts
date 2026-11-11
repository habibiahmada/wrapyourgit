import { expect, test } from "bun:test";
import { type Box, fitText, type Prim, scenePrims } from "./prims";
import type { RideCamera } from "./project";

const tone = { top: "#111111", left: "#222222", right: "#333333" };
const box: Box = { kind: "box", at: [0, 0, 0], size: [1, 1, 1], tone };
const cam: RideCamera = { pos: [-6, 5, 7], look: [0.5, 0.5, 0.5], fov: 40 };
const frame = { width: 400, height: 400 };
const clear = { color: "#000000", near: 100, far: 200 };
const polys = (prims: Prim[]) => prims.filter((p) => p.kind === "poly");

test("only the faces toward the camera are drawn, each in its tone", () => {
  const fills = polys(scenePrims([box], cam, frame, clear)).map((p) =>
    p.kind === "poly" ? p.fill : null,
  );
  expect(fills.sort()).toEqual(["#111111", "#222222", "#222222"]);
});

test("a box behind the camera draws nothing", () => {
  expect(scenePrims([{ ...box, at: [-20, 20, 20] }], cam, frame, clear)).toEqual([]);
});

test("primitives come far to near", () => {
  const prims = scenePrims([box, { ...box, at: [3, -3, 0] }], cam, frame, clear);
  for (let i = 1; i < prims.length; i++) {
    expect(prims[i]?.depth ?? 0).toBeLessThanOrEqual(prims[i - 1]?.depth ?? 0);
  }
});

test("a decal paints after its face, just in front of it", () => {
  const prims = scenePrims(
    [{ ...box, decals: [{ on: "top", rect: [0.2, 0.2, 0.8, 0.8], fill: "#ff0000" }] }],
    cam,
    frame,
    clear,
  );
  const face = prims.findIndex((p) => p.kind === "poly" && p.fill === "#111111");
  const decal = prims.findIndex((p) => p.kind === "poly" && p.fill === "#ff0000");
  expect(decal).toBeGreaterThan(face);
  expect(prims[decal]?.depth).toBeCloseTo((prims[face]?.depth ?? 0) - 0.02);
});

test("a round decal is a many-sided polygon", () => {
  const prims = scenePrims(
    [{ ...box, decals: [{ on: "top", rect: [0, 0, 1, 1], fill: "#ff0000", round: true }] }],
    cam,
    frame,
    clear,
  );
  const decal = prims.find((p) => p.kind === "poly" && p.fill === "#ff0000");
  expect(decal?.kind === "poly" ? decal.pts.length : 0).toBeGreaterThanOrEqual(12);
});

test("fog mixes toward its colour with depth, and lit skips it", () => {
  const thick = { color: "#000000", near: 0, far: 1 };
  for (const p of polys(scenePrims([box], cam, frame, thick))) {
    expect(p.kind === "poly" ? p.fill : "").toBe("#000000");
  }
  const lit = polys(scenePrims([{ ...box, lit: true }], cam, frame, thick)).map((p) =>
    p.kind === "poly" ? p.fill : null,
  );
  expect(lit.sort()).toEqual(["#111111", "#222222", "#222222"]);
});

test("an outline box has strokes and no fills", () => {
  const prims = polys(scenePrims([{ ...box, outline: true }], cam, frame, clear));
  expect(prims.length).toBe(3);
  for (const p of prims) {
    expect(p.kind === "poly" ? p.fill : "x").toBeNull();
    expect(p.kind === "poly" ? p.stroke : null).not.toBeNull();
  }
});

test("printed text fits its rect and reports its size on screen", () => {
  const prims = scenePrims(
    [{ ...box, texts: [{ on: "back", rect: [0, 0, 1, 1], text: "42%", fill: "#ffffff" }] }],
    cam,
    frame,
    clear,
  );
  const texts = prims.filter((p) => p.kind === "text");
  expect(texts).toHaveLength(1);
  const t = texts[0];
  if (t?.kind !== "text") throw new Error("no text");
  expect(t.text).toBe("42%");
  expect(t.size).toBeCloseTo(fitText("42%", 1, 1));
  expect(t.capHeightPx).toBeGreaterThan(0);
  expect(t.x).toBeCloseTo(0.5);
  expect(t.y).toBeCloseTo(0.5);
});

test("fitText shrinks a long line to its width", () => {
  expect(fitText("12", 10, 1)).toBeCloseTo(0.92);
  expect(fitText("a-very-long-repository-name", 2, 1)).toBeCloseTo(2 / (0.6 * 27));
});

test("a turned box keeps its faces' names", () => {
  const texts = [
    {
      on: "front" as const,
      rect: [0, 0, 1, 1] as [number, number, number, number],
      text: "A",
      fill: "#ffffff",
    },
  ];
  const count = (yaw: number) =>
    scenePrims([{ ...box, yaw, texts }], cam, frame, clear).filter((p) => p.kind === "text").length;
  expect(count(0)).toBe(0);
  expect(count(Math.PI)).toBe(1);
});

test("a ball at the lens is dropped, a far one is a circle", () => {
  const near = scenePrims(
    [{ kind: "ball", c: [-5, 4.5, 6], r: 0.2, color: "#ffffff" }],
    cam,
    frame,
    clear,
  );
  const far = scenePrims(
    [{ kind: "ball", c: [0.5, 0.5, 0.5], r: 0.2, color: "#ffffff" }],
    cam,
    frame,
    clear,
  );
  expect(near).toEqual([]);
  expect(far[0]?.kind).toBe("circle");
});

test("a logo prints on the upright faces that are tall enough", () => {
  const prims = scenePrims([{ ...box, size: [1, 1, 2], logo: "lang/x.svg" }], cam, frame, clear);
  expect(prims.filter((p) => p.kind === "image")).toHaveLength(2);
});
