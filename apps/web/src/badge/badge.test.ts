import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import {
  busyRecap,
  emptyRecap,
  provisionalRecap,
} from "../../../../packages/video/src/fixtures/edge-recaps";
import { sampleRecap } from "../../../../packages/video/src/fixtures/sample-recap";
import { BADGE_SHOWS, badgeContent, badgeShow, badgeSvg, cardSvg } from "./badge";
import { textWidth } from "./text-width";

const words = (recap: RecapData, show: (typeof BADGE_SHOWS)[number]) =>
  badgeContent(recap, show)?.words;

describe("badgeShow", () => {
  test("keeps a known value and falls back to contributions", () => {
    expect(badgeShow("streak")).toBe("streak");
    expect(badgeShow("stars")).toBe("contributions");
    expect(badgeShow(null)).toBe("contributions");
  });
});

describe("badgeContent", () => {
  test("a final recap states its numbers plainly", () => {
    expect(words(sampleRecap, "contributions")).toBe("1,284 contributions");
  });

  test('a recap before 31 December says "so far" on every badge', () => {
    for (const show of BADGE_SHOWS) {
      const content = badgeContent({ ...provisionalRecap, identity: sampleRecap.identity }, show);
      expect(content?.words.endsWith(" so far")).toBe(true);
    }
  });

  test("one of a thing is singular", () => {
    const one = {
      ...emptyRecap,
      contributions: { ...emptyRecap.contributions, total: 1, activeDays: 1 },
    };
    expect(words(one, "contributions")).toBe("1 contribution");
    expect(words(one, "days")).toBe("1 active day");
  });

  test("a streak reads for zero and one day too", () => {
    expect(words(emptyRecap, "streak")).toBe("longest streak 0 days");
    const one = {
      ...emptyRecap,
      contributions: {
        ...emptyRecap.contributions,
        longestStreak: { days: 1, start: "2026-03-02", end: "2026-03-02" },
      },
    };
    expect(words(one, "streak")).toBe("longest streak 1 day");
  });

  test("no top language or archetype means nothing to show, not a made-up value", () => {
    expect(badgeContent(emptyRecap, "language")).toBeNull();
    expect(badgeContent(emptyRecap, "archetype")).toBeNull();
  });
});

describe("badgeSvg", () => {
  test("is a labelled image with the user's number", () => {
    const svg = badgeSvg(sampleRecap, "contributions");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain("octo-sample&#39;s 2026 on WrapYourGit: 1,284 contributions");
    expect(svg).toContain("through 31 Dec 2026");
  });

  test("null and a recap with nothing to show draw the same neutral badge", () => {
    const neutral = badgeSvg(null, "contributions");
    expect(neutral).toContain("See the 2026 recap");
    expect(neutral).not.toMatch(/\d,\d{3}/);
    expect(badgeSvg(emptyRecap, "archetype")).toBe(neutral);
  });

  test("escapes what GitHub sends", () => {
    const odd: RecapData = {
      ...sampleRecap,
      languages: { ...sampleRecap.languages, top: [{ name: "<C&C>", color: null, share: 1 }] },
    };
    const svg = badgeSvg(odd, "language");
    expect(svg).toContain("&#60;C&#38;C&#62;");
    expect(svg).not.toContain("<C&C>");
  });

  test("grows with its text", () => {
    const width = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1]);
    expect(width(badgeSvg(busyRecap, "contributions"))).toBeGreaterThan(
      width(
        badgeSvg(
          { ...busyRecap, contributions: { ...busyRecap.contributions, total: 7 } },
          "contributions",
        ),
      ),
    );
  });
});

describe("cardSvg", () => {
  test("draws a cell for every day of the year", () => {
    const cells = cardSvg(sampleRecap).match(/<rect x="[\d.]+" y="[\d.]+" width="7"/g) ?? [];
    expect(cells.length).toBe(365);
  });

  test("days after the recap's last day are outlines, not empty data", () => {
    const svg = cardSvg(provisionalRecap);
    expect(svg).toContain('fill="none" stroke="#1b1a16"');
    expect(svg).toContain("2026 so far");
  });

  test("the neutral card shows no numbers", () => {
    const svg = cardSvg(null);
    expect(svg).toContain("See the 2026 recap");
    expect(svg).not.toMatch(/contributions/);
  });
});

describe("textWidth", () => {
  test("bold is wider than regular, and size scales it", () => {
    expect(textWidth("streak", 12, true)).toBeGreaterThan(textWidth("streak", 12));
    expect(textWidth("streak", 24)).toBeCloseTo(textWidth("streak", 12) * 2);
  });
});
