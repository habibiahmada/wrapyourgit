import { expect, test } from "bun:test";
import { busyRecap, emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { palette } from "../../theme";
import { gardenModel } from "./garden.model";

const withTop = (top: { name: string; color: string | null; share: number }[]) => ({
  ...sampleRecap,
  languages: { top, distinctCount: top.length },
});

test("gardenModel: one tree per language with percent, colour and a radius that follows sqrt(share)", () => {
  const m = gardenModel(
    withTop([
      { name: "TypeScript", color: "#3178c6", share: 0.64 },
      { name: "Go", color: "#00ADD8", share: 0.16 },
    ]),
  );
  expect(m.trees.map((t) => [t.name, t.percent, t.color])).toEqual([
    ["TypeScript", 64, "#3178c6"],
    ["Go", 16, "#00ADD8"],
  ]);
  const [a, b] = m.trees;
  expect(a?.radius).toBeCloseTo(0.8);
  expect(b?.radius).toBeCloseTo(0.4);
  expect((a?.radius ?? 0) / (b?.radius ?? 1)).toBeCloseTo(2);
  expect(m.other).toBeCloseTo(0.2);
  expect(m.otherNote).toBe("Everything else: 20%");
  expect(m.empty).toBe(false);
});

test("gardenModel: draws at most five trees and sums the rest into other", () => {
  const m = gardenModel(
    withTop(
      [0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05].map((share, i) => ({
        name: `L${i}`,
        color: "#111111",
        share,
      })),
    ),
  );
  expect(m.trees).toHaveLength(5);
  expect(m.other).toBeCloseTo(0.15);
  expect(m.otherNote).toBe("Everything else: 15%");
});

test("gardenModel: a null colour takes the fallback, a tiny share shows <1% and keeps a visible radius", () => {
  const m = gardenModel(
    withTop([
      { name: "Shell", color: null, share: 0.996 },
      { name: "Nix", color: null, share: 0.004 },
    ]),
  );
  expect(m.trees[0]?.color).toBe(palette.heat[2]);
  expect(m.trees[1]?.percent).toBe(0);
  expect(m.trees[1]?.label).toBe("<1%");
  expect(m.trees[1]?.radius).toBeGreaterThanOrEqual(0.12);
  expect(m.otherNote).toBeNull();
});

test("gardenModel: other is clamped at 0 and omitted under 0.5%", () => {
  const m = gardenModel(withTop([{ name: "Go", color: "#fff", share: 1.02 }]));
  expect(m.other).toBe(0);
  expect(m.otherNote).toBeNull();
});

test("gardenModel: the sample year grows a garden headed by its top language", () => {
  const m = gardenModel(sampleRecap);
  expect(m.trees.length).toBeGreaterThan(0);
  expect(m.title).toBe(`Mostly ${sampleRecap.languages.top[0]?.name}`);
  expect(m.caption).toContain("commits");
});

test("gardenModel: long names stay intact for the scene to fit", () => {
  const m = gardenModel(busyRecap);
  expect(m.trees[0]?.name).toBe("Jupyter Notebook");
  expect(m.trees).toHaveLength(5);
});

test("gardenModel: no languages is bare soil and says so", () => {
  const m = gardenModel(emptyRecap);
  expect(m.trees).toEqual([]);
  expect(m.empty).toBe(true);
  expect(m.other).toBe(0);
  expect(m.title).toBe("No language data yet");
  expect(m.otherNote).toBeNull();
});

test("gardenModel: the other note appears at exactly 0.5% and not just below", () => {
  const at = gardenModel(withTop([{ name: "Go", color: "#fff", share: 0.995 }]));
  expect(at.otherNote).toBe("Everything else: 1%");
  const below = gardenModel(withTop([{ name: "Go", color: "#fff", share: 0.996 }]));
  expect(below.otherNote).toBeNull();
});
