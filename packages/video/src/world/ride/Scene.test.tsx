import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Prim } from "./prims";
import { RideScene } from "./Scene";

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
  size: 3,
  fill: "#ffffff",
  weight: 800,
  capHeightPx: 20,
  depth: 8,
};
const circle: Prim = { kind: "circle", x: 4, y: 5, r: 6, fill: "#ffffff", opacity: 0.5, depth: 7 };
const image: Prim = { kind: "image", matrix: [2, 0, 0, 2, 1, 1], href: "lang/x.svg", depth: 6 };

const draw = (prims: Prim[]) =>
  renderToStaticMarkup(
    <svg>
      <title>test</title>
      <RideScene prims={prims} />
    </svg>,
  );

test("draws one element per primitive, in order", () => {
  const html = draw([poly, text, circle, image]);
  expect(html.indexOf("<polygon")).toBeLessThan(html.indexOf("<text"));
  expect(html.indexOf("<text")).toBeLessThan(html.indexOf("<circle"));
  expect(html.indexOf("<circle")).toBeLessThan(html.indexOf("<image"));
  expect(html).toContain(">42%</text>");
});

test("text lies on its face through its matrix, centred", () => {
  const html = draw([text]);
  expect(html).toContain('transform="matrix(1 0 0 1 5 6)"');
  expect(html).toContain('text-anchor="middle"');
  expect(html).toContain('dominant-baseline="central"');
  expect(html).toContain('font-size="3"');
});

test("an outline polygon has no fill", () => {
  expect(draw([{ ...poly, fill: null }])).toContain('fill="none"');
});

test("an image is a unit square under its matrix", () => {
  const html = draw([image]);
  expect(html).toContain('width="1"');
  expect(html).toContain('transform="matrix(2 0 0 2 1 1)"');
});
