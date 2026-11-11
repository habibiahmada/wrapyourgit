import { expect, test } from "bun:test";
import { type Brush, paintPrims } from "./paint";
import type { Prim } from "./prims";

/** A stand-in for a canvas context that writes down what it is asked to draw. */
function recorder() {
  const log: string[] = [];
  const state = { fillStyle: "", strokeStyle: "", globalAlpha: 1, font: "", lineWidth: 0 };
  const brush = {
    ...state,
    lineJoin: "miter",
    textAlign: "start",
    textBaseline: "alphabetic",
    save: () => log.push("save"),
    restore: () => log.push("restore"),
    beginPath: () => log.push("begin"),
    closePath: () => log.push("close"),
    moveTo: (x: number, y: number) => log.push(`M${x},${y}`),
    lineTo: (x: number, y: number) => log.push(`L${x},${y}`),
    arc: (x: number, y: number, r: number) => log.push(`arc ${x},${y},${r}`),
    fill() {
      log.push(`fill ${this.fillStyle} a${this.globalAlpha}`);
    },
    stroke() {
      log.push(`stroke ${this.strokeStyle}`);
    },
    transform: (...m: number[]) => log.push(`transform ${m.join(" ")}`),
    fillText(text: string, x: number, y: number) {
      log.push(`text ${text} @${x},${y} ${this.font} ${this.fillStyle}`);
    },
    drawImage: (image: unknown, x: number, y: number, w: number, h: number) =>
      log.push(`image ${String(image)} ${x},${y},${w},${h}`),
  };
  return { brush: brush as unknown as Brush, log };
}

const poly: Prim = {
  kind: "poly",
  pts: [
    [0, 0],
    [10, 0],
    [10, 10],
  ],
  fill: "#111111",
  stroke: "#000000",
  depth: 9,
};
const text: Prim = {
  kind: "text",
  matrix: [1, 0, 0, 1, 5, 6],
  text: "42%",
  x: 1,
  y: 2,
  size: 0.5,
  fill: "#ffffff",
  weight: 800,
  capHeightPx: 20,
  depth: 8,
};
const circle: Prim = { kind: "circle", x: 4, y: 5, r: 6, fill: "#abcdef", opacity: 0.5, depth: 7 };
const image: Prim = { kind: "image", matrix: [2, 0, 0, 2, 1, 1], href: "lang/x.svg", depth: 6 };
const extras = { fontFamily: "Test", images: new Map<string, CanvasImageSource>() };

test("paints primitives in the order given", () => {
  const { brush, log } = recorder();
  paintPrims(brush, [poly, circle], extras);
  expect(log.indexOf("fill #111111 a1")).toBeLessThan(log.indexOf("fill #abcdef a0.5"));
});

test("a polygon is filled, then edged", () => {
  const { brush, log } = recorder();
  paintPrims(brush, [poly], extras);
  expect(log).toEqual([
    "begin",
    "M0,0",
    "L10,0",
    "L10,10",
    "close",
    "fill #111111 a1",
    "stroke #000000",
  ]);
});

test("an outline polygon is edged and not filled", () => {
  const { brush, log } = recorder();
  paintPrims(brush, [{ ...poly, fill: null }], extras);
  expect(log.some((l) => l.startsWith("fill"))).toBe(false);
  expect(log).toContain("stroke #000000");
});

test("a circle's opacity does not leak into what follows", () => {
  const { brush, log } = recorder();
  paintPrims(brush, [circle, poly], extras);
  expect(log).toContain("fill #abcdef a0.5");
  expect(log).toContain("fill #111111 a1");
});

test("text lies on its face through its matrix, at a font size the browser draws well", () => {
  const { brush, log } = recorder();
  paintPrims(brush, [text], extras);
  // The matrix, then a scale that turns a 100px font into the text's size in world units.
  expect(log).toContain("transform 1 0 0 1 5 6");
  expect(log).toContain("transform 0.005 0 0 0.005 0 0");
  // A generic family follows the story's own, so a face that has not loaded falls back to sans-serif.
  expect(log).toContain("text 42% @200,400 800 100px Test, sans-serif #ffffff");
  expect(log[0]).toBe("save");
  expect(log.at(-1)).toBe("restore");
});

test("an image is drawn as a unit square under its matrix, once it has loaded", () => {
  const first = recorder();
  paintPrims(first.brush, [image], extras);
  expect(first.log.some((l) => l.startsWith("image"))).toBe(false);
  const loaded = recorder();
  const images = new Map<string, CanvasImageSource>([
    ["lang/x.svg", "LOGO" as unknown as CanvasImageSource],
  ]);
  paintPrims(loaded.brush, [image], { ...extras, images });
  expect(loaded.log).toContain("transform 2 0 0 2 1 1");
  expect(loaded.log).toContain("image LOGO 0,0,1,1");
});
