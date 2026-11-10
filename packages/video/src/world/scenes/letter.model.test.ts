import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { busyRecap, emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { congratsLetter, type Letter } from "../../letter";
import { buildWorld } from "../model";
import { labelWidth } from "./fit";
import { letterGeometry, paginateLetter, paginateLetterLines } from "./letter.model";

const words = (texts: string[]) => texts.join(" ").split(/\s+/).filter(Boolean);
const letterWords = (letter: Letter) =>
  words([letter.greeting, ...letter.paragraphs, letter.signOff]);

const sample = congratsLetter(sampleRecap);
const long: Letter = {
  ...sample,
  paragraphs: [...sample.paragraphs, ...sample.paragraphs, ...sample.paragraphs],
};
const letters = {
  sample,
  long,
  empty: congratsLetter(emptyRecap),
  busy: congratsLetter(busyRecap),
};

for (const [formatId, format] of Object.entries(VIDEO_FORMATS)) {
  for (const [name, letter] of Object.entries(letters)) {
    test(`paginateLetter ${formatId} ${name}: lines fit, words whole and in order`, () => {
      const { body, textWidth, linesPerPage } = letterGeometry(format);
      const pages = paginateLetter(letter, format);
      expect(pages.length).toBeGreaterThanOrEqual(1);
      for (const page of pages) {
        expect(page.length).toBeGreaterThan(0);
        expect(page.length).toBeLessThanOrEqual(linesPerPage);
        // A blank line only separates paragraphs: never first or last on a page.
        expect(page[0]).not.toBe("");
        expect(page.at(-1)).not.toBe("");
      }
      for (const line of paginateLetterLines(letter, format).flat()) {
        // Measured as the scene sets it; a single word longer than a line may overrun (Label shrinks it).
        const weight = line.kind === "body" ? 400 : 700;
        if (line.text.includes(" "))
          expect(labelWidth(line.text, body, weight)).toBeLessThanOrEqual(textWidth);
      }
      expect(words(pages.flat())).toEqual(letterWords(letter));
    });
  }
}

test("paginateLetter: the 3x letter needs more pages than the sample, and tall frames fewer", () => {
  for (const format of Object.values(VIDEO_FORMATS)) {
    expect(paginateLetter(long, format).length).toBeGreaterThan(
      paginateLetter(sample, format).length,
    );
  }
  expect(paginateLetter(long, VIDEO_FORMATS["9x16"]).length).toBeLessThan(
    paginateLetter(long, VIDEO_FORMATS["1x1"]).length,
  );
});

test("paginateLetter: lines use the column, and the sample letter takes at most 5 pages", () => {
  for (const format of Object.values(VIDEO_FORMATS)) {
    const { body, textWidth } = letterGeometry(format);
    const widest = Math.max(
      ...paginateLetterLines(sample, format)
        .flat()
        .map((line) => labelWidth(line.text, body, line.kind === "body" ? 400 : 700)),
    );
    expect(widest).toBeGreaterThan(textWidth * 0.9);
    expect(paginateLetter(sample, format).length).toBeLessThanOrEqual(5);
  }
});

test("paginateLetter: a word longer than a line keeps its own line, unsplit", () => {
  const giant = "x".repeat(80);
  const pages = paginateLetter(
    { greeting: `Dear @${giant},`, paragraphs: ["Short."], signOff: "Bye" },
    VIDEO_FORMATS["9x16"],
  );
  expect(pages[0]?.[0]).toBe(`Dear`);
  expect(pages[0]?.[1]).toBe(`@${giant},`);
});

test("letterGeometry: body is 4.2% of the short side (3.6% when square), in scene units", () => {
  const { body } = letterGeometry(VIDEO_FORMATS["16x9"]);
  // 1080 px short side on a 1920 px wide frame; scene units are 1000 / 1920 px.
  expect(body).toBeCloseTo((0.042 * 1080 * 1000) / 1920, 6);
  // Square frames set it a little smaller to keep the page count down.
  expect(letterGeometry(VIDEO_FORMATS["1x1"]).body).toBeCloseTo(36, 6);
});

test("buildWorld: one letter stop per page, numbered 1..N", () => {
  for (const format of Object.values(VIDEO_FORMATS)) {
    const pages = paginateLetter(sample, format).length;
    const letterStops = buildWorld(sampleRecap, format, "video", 30).stops.filter(
      (s) => s.kind === "letter",
    );
    expect(letterStops.map((s) => s.id)).toEqual(
      Array.from({ length: pages }, (_, i) => `letter-${i + 1}`),
    );
    expect(letterStops.map((s) => s.page)).toEqual(Array.from({ length: pages }, (_, i) => i + 1));
  }
  // At least one format really paginates, so the test above isn't trivially one page.
  expect(paginateLetter(sample, VIDEO_FORMATS["1x1"]).length).toBeGreaterThan(1);
});
