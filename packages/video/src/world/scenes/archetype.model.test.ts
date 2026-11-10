import { expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import {
  ARCHETYPE_INTRO,
  ARCHETYPE_NONE,
  archetypeModel,
  MAX_REASONS,
  wrapLines,
} from "./archetype.model";

const withIdentity = (i: Partial<RecapData["identity"]>): RecapData => ({
  ...sampleRecap,
  identity: { ...sampleRecap.identity, ...i },
});

test("archetypeModel: sample is the builder with its two reasons", () => {
  expect(archetypeModel(sampleRecap)).toEqual({
    id: "builder",
    title: "Builder",
    intro: ARCHETYPE_INTRO,
    reasons: ["1,204 commits to your own repositories", "6 new repositories this year"],
  });
  expect(ARCHETYPE_INTRO).toBe("This year you were");
});

test("archetypeModel: uses the shared display names", () => {
  expect(archetypeModel(withIdentity({ archetype: "night-owl" }))?.title).toBe("Night owl");
});

test("archetypeModel: at most three reasons", () => {
  const m = archetypeModel(withIdentity({ reasons: ["a", "b", "c", "d", "e"] }));
  expect(m?.reasons).toEqual(["a", "b", "c"]);
  expect(MAX_REASONS).toBe(3);
});

test("archetypeModel: null archetype (empty year) is null", () => {
  expect(archetypeModel(emptyRecap)).toBeNull();
  expect(archetypeModel(withIdentity({ archetype: null, reasons: ["x"] }))).toBeNull();
  expect(ARCHETYPE_NONE).toBe("Not enough activity to name your style yet");
});

test("wrapLines: a line that fits stays whole", () => {
  expect(wrapLines("6 new repositories", 40, 700, 900, 20)).toEqual(["6 new repositories"]);
});

test("wrapLines: a long line breaks at a space near the middle instead of shrinking", () => {
  const text = "1,204 pull requests to other people's repositories this year";
  const lines = wrapLines(text, 40, 700, 700, 36);
  expect(lines.length).toBe(2);
  expect(lines.join(" ")).toBe(text);
});

test("wrapLines: one unbreakable word stays one line", () => {
  expect(wrapLines("Supercalifragilistic", 40, 700, 100, 36)).toEqual(["Supercalifragilistic"]);
});
