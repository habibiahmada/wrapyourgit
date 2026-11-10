import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { busyRecap, emptyRecap } from "./fixtures/edge-recaps";
import { sampleRecap } from "./fixtures/sample-recap";
import { activityTier, congratsLetter } from "./letter";

const text = (recap: RecapData) => {
  const letter = congratsLetter(recap);
  return [letter.greeting, ...letter.paragraphs, letter.signOff].join("\n");
};
const numbers = (s: string) => (s.match(/\d[\d,]*/g) ?? []).filter((n) => n !== "2026").length;

const withActivity = (activeDays: number, total: number): RecapData => ({
  ...sampleRecap,
  contributions: { ...sampleRecap.contributions, activeDays, total },
});

describe("activityTier", () => {
  test("splits years by how often the person showed up", () => {
    expect(activityTier(withActivity(0, 0))).toBe("blank");
    expect(activityTier(withActivity(12, 30))).toBe("quiet");
    expect(activityTier(withActivity(80, 400))).toBe("steady");
    expect(activityTier(withActivity(160, 1500))).toBe("busy");
    expect(activityTier(withActivity(300, 5000))).toBe("relentless");
  });
});

describe("congratsLetter", () => {
  test("reads like a letter: several warm paragraphs, few numbers", () => {
    const letter = congratsLetter(sampleRecap);
    expect(letter.paragraphs.length).toBeGreaterThanOrEqual(5);
    expect(numbers(letter.paragraphs.join(" "))).toBeLessThanOrEqual(4);
    expect(letter.paragraphs.join(" ").length).toBeGreaterThan(700);
  });

  test("still grounded in the real year: language, month, archetype", () => {
    const letter = text(sampleRecap);
    expect(letter).toContain("Dear Sample Dev,");
    expect(letter).toContain("TypeScript");
    expect(letter).toContain("June");
    expect(letter).toContain("Builder");
  });

  test("the tone follows the tier", () => {
    const quiet = text(withActivity(12, 30));
    const relentless = text(withActivity(300, 5000));
    expect(quiet).not.toEqual(relentless);
    expect(quiet.toLowerCase()).toContain("quiet");
    expect(relentless.toLowerCase()).toMatch(/rest|pace|breathe/);
  });

  test("an empty year gets encouragement, not a list of zeros", () => {
    const letter = text(emptyRecap);
    expect(letter).not.toMatch(/\b0 (contributions|days)\b/);
    expect(letter).toContain("Your story is just beginning");
    expect(congratsLetter(emptyRecap).paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  test("mentions runner-up archetypes when there are any", () => {
    expect(text(sampleRecap)).toContain("Consistent");
  });

  test("never uses an em dash (antislop R-02)", () => {
    for (const recap of [sampleRecap, emptyRecap, busyRecap])
      expect(text(recap)).not.toContain("—");
  });

  test("a provisional year says 'so far'", () => {
    const provisional = { ...sampleRecap, meta: { ...sampleRecap.meta, isFinal: false } };
    expect(text(provisional)).toContain("so far");
  });

  test("uses 'an' before a vowel", () => {
    const explorer: RecapData = {
      ...sampleRecap,
      identity: { archetype: "explorer", scores: { explorer: 0.7 }, reasons: [] },
    };
    expect(text(explorer)).toMatch(/\ban Explorer\b/);
  });

  test("the same person always gets the same letter", () => {
    expect(text(sampleRecap)).toEqual(text(sampleRecap));
  });

  test("falls back to the login when there is no display name", () => {
    const noName = { ...sampleRecap, profile: { ...sampleRecap.profile, name: null } };
    expect(congratsLetter(noName).greeting).toBe("Dear @octo-sample,");
  });
});
