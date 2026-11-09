import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { labelFontSize, labelRoom, labelWidth, safeArea, sceneHeight } from "./fit";

const WEIGHTS = [400, 700, 800] as const;

test("labelFontSize: the label fits maxWidth for each weight and case", () => {
  for (const weight of WEIGHTS) {
    for (const text of ["a-very-long-github-login-name", "BUSIEST DAY OF THE YEAR"]) {
      const size = labelFontSize(text, 200, weight, 400);
      expect(labelWidth(text, size, weight)).toBeLessThanOrEqual(400 + 1e-9);
    }
  }
});

test("labelFontSize: never above size, and long text shrinks", () => {
  for (const weight of WEIGHTS) {
    expect(labelFontSize("hi", 60, weight, 1000)).toBe(60);
    const short = labelFontSize("TypeScript", 80, weight, 300);
    const long = labelFontSize("TypeScript and Jupyter Notebook", 80, weight, 300);
    expect(long).toBeLessThan(short);
  }
});

test("labelFontSize: heavier and all-caps text is treated as wider", () => {
  const at = (text: string, weight: 400 | 700 | 800) => labelFontSize(text, 500, weight, 300);
  expect(at("contributions", 800)).toBeLessThan(at("contributions", 700));
  expect(at("contributions", 700)).toBeLessThan(at("contributions", 400));
  expect(at("CONTRIBUTIONS", 700)).toBeLessThan(at("contributions", 700));
});

test("labelRoom: the width the anchor leaves inside the scene, capped by maxWidth", () => {
  expect(labelRoom(500, "middle")).toBe(1000);
  expect(labelRoom(200, "middle")).toBe(400);
  expect(labelRoom(900, "middle")).toBe(200);
  expect(labelRoom(80, "start")).toBe(920);
  expect(labelRoom(80, "end")).toBe(80);
  expect(labelRoom(80, "start", 300)).toBe(300);
  expect(labelRoom(500, "middle", 2000)).toBe(1000);
  expect(labelRoom(1200, "start")).toBe(0);
});

test("safeArea: clear of the progress bar and the copyright line in every format", () => {
  for (const format of Object.values(VIDEO_FORMATS)) {
    const h = sceneHeight(format);
    const { top, bottom } = safeArea(format);
    const unitPx = format.width / 1000;
    const refPx = Math.min(format.width, format.height) / 1080;
    expect(top * unitPx).toBeGreaterThan(4 * refPx);
    // The copyright line's top sits 40 + 22 reference px above the bottom edge.
    expect(bottom * unitPx).toBeGreaterThan(62 * refPx);
    expect(top + bottom).toBeLessThan(h / 4);
  }
});
