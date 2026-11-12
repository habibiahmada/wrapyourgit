import { expect, test } from "bun:test";
import { type Box, fitText, type Prim, scenePrims } from "./prims";
import { projectPoint, type RideCamera } from "./project";

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

test("a flipped text is turned half round in its rect, for reading from the other side", () => {
  const rect: [number, number, number, number] = [0.1, 0.2, 0.9, 0.8];
  const one = (flip: boolean) => {
    const prim = scenePrims(
      [{ ...box, texts: [{ on: "top", rect, text: "A", fill: "#ffffff", flip }] }],
      cam,
      frame,
      clear,
    ).find((p) => p.kind === "text");
    if (prim?.kind !== "text") throw new Error("no text");
    return prim;
  };
  const plain = one(false);
  const turned = one(true);
  // Both axes point the other way. The sizes differ a little because the two are laid out from
  // opposite corners, and perspective makes the far corner smaller.
  const along = turned.matrix[0] * plain.matrix[0] + turned.matrix[1] * plain.matrix[1];
  const down = turned.matrix[2] * plain.matrix[2] + turned.matrix[3] * plain.matrix[3];
  expect(along).toBeLessThan(0);
  expect(down).toBeLessThan(0);
  expect(turned.size).toBeCloseTo(plain.size);
  expect(turned.capHeightPx / plain.capHeightPx).toBeGreaterThan(0.8);
  expect(turned.capHeightPx / plain.capHeightPx).toBeLessThan(1.25);
});

test("a slab marked as lying under others is painted before what stands on it", () => {
  // A wide floor, and a block on its far half: the floor's middle is nearer the camera than the
  // block, so by depth alone the floor's top would be painted over the block's foot.
  const floor: Box = { kind: "box", at: [-4, -4, 0], size: [8, 8, 0.2], tone, under: 1 };
  const block: Box = {
    kind: "box",
    at: [2, -3.5, 0.2],
    size: [1, 1, 2],
    tone: { top: "#aaaaaa", left: "#bbbbbb", right: "#cccccc" },
  };
  const fills = polys(scenePrims([block, floor], cam, frame, clear)).map((p) =>
    p.kind === "poly" ? p.fill : null,
  );
  expect(fills.indexOf("#111111")).toBeLessThan(fills.indexOf("#bbbbbb"));
  expect(fills.lastIndexOf("#222222")).toBeLessThan(fills.indexOf("#aaaaaa"));
  // Without the mark the floor's top comes after the block's side.
  const plain = polys(scenePrims([block, { ...floor, under: undefined }], cam, frame, clear)).map(
    (p) => (p.kind === "poly" ? p.fill : null),
  );
  expect(plain.indexOf("#111111")).toBeGreaterThan(plain.indexOf("#bbbbbb"));
});

test("text on a face seen in steep perspective runs along its middle line, end to end", () => {
  // A long board close to a wide lens: its top and bottom edges run at different slopes.
  const near: RideCamera = { pos: [-1, -5, 2], look: [6, 0, 2], fov: 70 };
  const wall: Box = {
    kind: "box",
    at: [0, 0, 0],
    size: [10, 0.2, 4],
    tone,
    texts: [{ on: "all", rect: [0, 0, 1, 1], text: "2026", fill: "#ffffff" }],
  };
  // The long face toward the camera: its text is centred 5 along.
  const text = scenePrims([wall], near, frame, clear).find(
    (p) => p.kind === "text" && Math.abs(p.x - 5) < 1e-9,
  );
  if (text?.kind !== "text") throw new Error("no text");
  const on = (x: number, z: number) => {
    const p = projectPoint([x, 0, z], near, frame);
    if (!p) throw new Error("behind the camera");
    return p;
  };
  const [a, b, c, d, e, f] = text.matrix;
  // Its middle line runs from the middle of the face's one end to the middle of the other, so
  // the words never run past an end that the view has made short.
  const ends = [on(0, 2), on(10, 2)] as const;
  const wide = text.x * 2;
  expect(c * text.y + e).toBeCloseTo(ends[0][0], 3);
  expect(d * text.y + f).toBeCloseTo(ends[0][1], 3);
  expect(a * wide + c * text.y + e).toBeCloseTo(ends[1][0], 3);
  expect(b * wide + d * text.y + f).toBeCloseTo(ends[1][1], 3);
  // Its baseline runs along the face's middle line, not along its top edge.
  const [left, right] = [on(0, 2), on(10, 2)];
  const along = Math.atan2(Math.abs(right[1] - left[1]), Math.abs(right[0] - left[0]));
  expect(Math.atan2(Math.abs(b), Math.abs(a))).toBeCloseTo(along, 3);
});

test("a picture stands square to the screen, as wide as its distance makes it, on its anchor", () => {
  const picture = {
    kind: "picture" as const,
    c: [2, 1, 0] as [number, number, number],
    href: "art/room.png",
    wide: 4,
    tall: 3,
    anchor: [0.5, 0.6] as [number, number],
  };
  const prims = scenePrims([picture], cam, frame, clear);
  expect(prims).toHaveLength(1);
  const image = prims[0];
  if (image?.kind !== "image") throw new Error("a picture is drawn as an image");
  const [a, b, c, d, e, f] = image.matrix;
  // No turn and no slant: it faces whoever is looking, like a cut-out.
  expect(b).toBe(0);
  expect(c).toBe(0);
  expect(a / d).toBeCloseTo(4 / 3);
  // Its anchor is where its place on the ground lands on screen.
  const foot = projectPoint([2, 1, 0], cam, frame);
  expect(e + a * 0.5).toBeCloseTo(foot?.[0] ?? 0);
  expect(f + d * 0.6).toBeCloseTo(foot?.[1] ?? 0);
  // Twice as far, half as wide.
  const far = scenePrims([{ ...picture, c: [20, -11, -14] }], cam, frame, clear)[0];
  if (far?.kind !== "image") throw new Error("a picture is drawn as an image");
  expect(far.matrix[0]).toBeLessThan(a);
});
