import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import {
  busyRecap,
  emptyRecap,
  provisionalRecap,
} from "../../../../packages/video/src/fixtures/edge-recaps";
import { sampleRecap } from "../../../../packages/video/src/fixtures/sample-recap";
import { BADGE_SHOWS, badgeContent, badgeShows, badgeSvg, cardSide, cardSvg } from "./badge";
import { textWidth } from "./text-width";

const words = (recap: RecapData, show: (typeof BADGE_SHOWS)[number]) =>
  badgeContent(recap, show)?.words;
const width = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1]);
const label = (svg: string) => /aria-label="([^"]*)"/.exec(svg)?.[1];

describe("badgeShows", () => {
  test("reads a list in the order given, each once", () => {
    expect(badgeShows("streak,contributions,streak")).toEqual(["streak", "contributions"]);
    expect(badgeShows(" Language , days ")).toEqual(["language", "days"]);
  });

  test("drops unknown names and falls back to contributions", () => {
    expect(badgeShows("stars,streak")).toEqual(["streak"]);
    expect(badgeShows("stars")).toEqual(["contributions"]);
    expect(badgeShows(null)).toEqual(["contributions"]);
  });

  test("keeps at most four values", () => {
    expect(badgeShows(BADGE_SHOWS.join(","))).toHaveLength(4);
  });
});

describe("cardSide", () => {
  test("is left unless right is asked for", () => {
    expect(cardSide("right")).toBe("right");
    expect(cardSide("middle")).toBe("left");
    expect(cardSide(null)).toBe("left");
  });
});

describe("badgeContent", () => {
  test("states each value plainly", () => {
    expect(words(sampleRecap, "contributions")).toBe("1,284 contributions");
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
    const svg = badgeSvg(sampleRecap, ["contributions"]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('role="img"');
    expect(label(svg)).toBe(
      "octo-sample&#39;s 2026 on WrapYourGit: 1,284 contributions, through 31 Dec 2026",
    );
  });

  test("shows the mark and the year, not the product name", () => {
    const svg = badgeSvg(sampleRecap, ["contributions"]);
    expect(svg).toContain(">2026</text>");
    expect(svg).not.toContain(">WrapYourGit</text>");
  });

  test("puts several values in one badge, in the order asked", () => {
    const svg = badgeSvg(sampleRecap, ["streak", "contributions", "language"]);
    expect(label(svg)).toContain(
      "longest streak 24 days, 1,284 contributions, top language TypeScript",
    );
    expect(width(svg)).toBeGreaterThan(width(badgeSvg(sampleRecap, ["streak"])));
  });

  test('a recap before 31 December says "so far" once', () => {
    const svg = badgeSvg(provisionalRecap, ["contributions", "days"]);
    expect(svg.match(/>so far</g)).toHaveLength(1);
    expect(label(svg)).toContain("on WrapYourGit so far:");
  });

  test("leaves out values with nothing to show, and is neutral when none are left", () => {
    expect(label(badgeSvg(emptyRecap, ["language", "contributions"]))).toContain(
      ": 0 contributions,",
    );
    const neutral = badgeSvg(null, ["contributions"]);
    expect(neutral).toContain("See the 2026 recap");
    expect(neutral).not.toMatch(/\d,\d{3}/);
    expect(badgeSvg(emptyRecap, ["archetype", "language"])).toBe(neutral);
  });

  test("escapes what GitHub sends", () => {
    const odd: RecapData = {
      ...sampleRecap,
      languages: { ...sampleRecap.languages, top: [{ name: "<C&C>", color: null, share: 1 }] },
    };
    const svg = badgeSvg(odd, ["language"]);
    expect(svg).toContain("&#60;C&#38;C&#62;");
    expect(svg).not.toContain("<C&C>");
  });

  test("grows with its text", () => {
    const seven = { ...busyRecap, contributions: { ...busyRecap.contributions, total: 7 } };
    expect(width(badgeSvg(busyRecap, ["contributions"]))).toBeGreaterThan(
      width(badgeSvg(seven, ["contributions"])),
    );
  });
});

describe("motion", () => {
  test("plays once, briefly, and not for readers who ask for reduced motion", () => {
    for (const svg of [badgeSvg(sampleRecap, ["contributions"]), cardSvg(sampleRecap)]) {
      expect(svg).toContain("@media (prefers-reduced-motion:no-preference)");
      expect(svg).not.toContain("infinite");
      const delays = [...svg.matchAll(/animation-delay:([\d.]+)s/g)].map((m) => Number(m[1]));
      // The last entrance starts by 1.6 s and lasts 0.5 s: the image is still within 5 s.
      expect(Math.max(...delays)).toBeLessThanOrEqual(1.6);
    }
  });
});

describe("cardSvg", () => {
  test("draws a cell for every day of the year", () => {
    const cells = cardSvg(sampleRecap).match(/<use href="#d"/g) ?? [];
    expect(cells.length).toBe(365);
  });

  test("days after the recap's last day are outlines, not empty data", () => {
    const svg = cardSvg(provisionalRecap);
    expect(svg).toContain('class="f"');
    expect(svg).toContain("2026 so far");
  });

  test("the archetype's diorama stands on the side asked for", () => {
    const imageX = (svg: string) => Number(/<image href="[^"]+" x="([\d.]+)"/.exec(svg)?.[1]);
    const left = cardSvg(sampleRecap, "left");
    const right = cardSvg(sampleRecap, "right");
    expect(width(left)).toBe(720);
    expect(imageX(left)).toBeLessThan(220);
    expect(imageX(right)).toBeGreaterThan(500);
    expect(label(left)).toContain("Builder archetype");
    expect(left.length).toBeLessThan(40_000);
  });

  test("no archetype means no diorama, at the calendar's own width", () => {
    const svg = cardSvg(emptyRecap, "right");
    expect(svg).not.toContain("<image");
    expect(width(svg)).toBe(500);
  });

  test("the neutral card shows no numbers and no diorama", () => {
    const svg = cardSvg(null);
    expect(svg).toContain("See the 2026 recap");
    expect(svg).not.toContain("<image");
    expect(svg).not.toMatch(/contributions/);
  });
});

describe("textWidth", () => {
  test("bold is wider than regular, and size scales it", () => {
    expect(textWidth("streak", 12, true)).toBeGreaterThan(textWidth("streak", 12));
    expect(textWidth("streak", 24)).toBeCloseTo(textWidth("streak", 12) * 2);
  });
});
