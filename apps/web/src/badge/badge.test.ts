import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import {
  busyRecap,
  emptyRecap,
  provisionalRecap,
} from "../../../../packages/video/src/fixtures/edge-recaps";
import { sampleRecap } from "../../../../packages/video/src/fixtures/sample-recap";
import {
  BADGE_SHOWS,
  badgeContent,
  badgeShows,
  badgeSvg,
  cardOptions,
  cardSvg,
  snakeRoute,
  snakeSvg,
} from "./badge";
import { LANGUAGE_ICONS } from "./language-icons";
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

describe("cardOptions", () => {
  test("places the archetype left unless right is asked for", () => {
    expect(cardOptions({ archetype: "right" }).side).toBe("right");
    expect(cardOptions({ archetype: "middle" }).side).toBe("left");
    expect(cardOptions({}).side).toBe("left");
  });

  test("hides the parts listed, ignoring unknown names", () => {
    expect(cardOptions({ hide: "graph, Stats,legend" })).toEqual({
      layout: "wide",
      side: "left",
      archetype: true,
      name: true,
      graph: false,
      stats: false,
    });
  });

  test("hiding every part gives the default card, not an empty frame", () => {
    expect(cardOptions({ hide: "archetype,graph,stats" })).toEqual(cardOptions({}));
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

describe("language logos", () => {
  const withLanguage = (name: string): RecapData => ({
    ...sampleRecap,
    languages: { ...sampleRecap.languages, top: [{ name, color: "#dea584", share: 1 }] },
  });

  test("a language with a Devicon logo shows the logo, in the badge and on the card", () => {
    expect(badgeSvg(withLanguage("TypeScript"), ["language"])).toContain(
      `<image href="${LANGUAGE_ICONS.typescript}"`,
    );
    expect(cardSvg(withLanguage("TypeScript"))).toContain(
      `<image href="${LANGUAGE_ICONS.typescript}"`,
    );
  });

  test("a language with no logo keeps a dot in its GitHub colour", () => {
    const svg = badgeSvg(withLanguage("Gleam"), ["language"]);
    expect(svg).toContain('fill="#dea584"');
    expect(svg).not.toContain("data:image/svg+xml");
  });

  test("logos drawn in plain black are given the text colour, so they show on the dark ground", () => {
    const rust = Buffer.from(LANGUAGE_ICONS.rust?.split(",")[1] ?? "", "base64").toString();
    expect(rust).toContain('<svg fill="#eeeae0"');
    const ts = Buffer.from(LANGUAGE_ICONS.typescript?.split(",")[1] ?? "", "base64").toString();
    expect(ts).not.toContain('<svg fill="#eeeae0"');
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
  const graph = cardOptions({ show: "graph" });

  test("leaves the graph out unless it is asked for", () => {
    expect(cardSvg(sampleRecap)).not.toContain('<use href="#d"');
    expect(cardOptions({}).graph).toBe(false);
    expect(graph.graph).toBe(true);
  });

  test("draws a cell for every day of the year", () => {
    const cells = cardSvg(sampleRecap, graph).match(/<use href="#d"/g) ?? [];
    expect(cells.length).toBe(365);
  });

  test("days after the recap's last day are outlines, not empty data", () => {
    const svg = cardSvg(provisionalRecap, graph);
    expect(svg).toContain('class="f"');
    expect(svg).toContain("2026 so far");
  });

  test("the archetype's diorama stands on the side asked for", () => {
    const imageX = (svg: string) => Number(/<image href="[^"]+" x="([\d.]+)"/.exec(svg)?.[1]);
    const left = cardSvg(sampleRecap, graph);
    const right = cardSvg(sampleRecap, cardOptions({ archetype: "right", show: "graph" }));
    expect(width(left)).toBe(720);
    expect(imageX(left)).toBeLessThan(220);
    expect(imageX(right)).toBeGreaterThan(500);
    expect(label(left)).toContain("Builder archetype");
    // Budget: the diorama is about 28 KB once base64, the calendar about 16 KB.
    expect(left.length).toBeLessThan(56_000);
  });

  test("no archetype means no diorama, at the calendar's own width", () => {
    const svg = cardSvg(emptyRecap, cardOptions({ archetype: "right" }));
    expect(svg).not.toContain("data:image/webp");
    expect(width(svg)).toBe(500);
  });

  test("each part can be left out", () => {
    const noGraph = cardSvg(sampleRecap, cardOptions({ show: "graph", hide: "graph" }));
    expect(noGraph).not.toContain('<use href="#d"');
    expect(noGraph).toContain(">1,284<");

    const noStats = cardSvg(sampleRecap, cardOptions({ hide: "stats", show: "graph" }));
    expect(noStats).not.toContain(">1,284<");
    expect(noStats).toContain('<use href="#d"');

    const noArchetype = cardSvg(sampleRecap, cardOptions({ hide: "archetype" }));
    expect(noArchetype).not.toContain("data:image/webp");
    expect(width(noArchetype)).toBe(500);
  });

  test("the archetype's name can go, and the diorama grows into its place", () => {
    const imageHeight = (svg: string) =>
      Number(
        /<image href="[^"]+" x="[\d.]+" y="[\d.]+" width="[\d.]+" height="([\d.]+)"/.exec(svg)?.[1],
      );
    const named = cardSvg(sampleRecap);
    const unnamed = cardSvg(sampleRecap, cardOptions({ hide: "name" }));
    expect(unnamed).not.toContain(">Builder<");
    expect(unnamed).not.toContain(">archetype<");
    expect(imageHeight(unnamed)).toBeGreaterThan(imageHeight(named));
    // The archetype is still in the image's accessible name.
    expect(label(unnamed)).toContain("Builder archetype");
  });

  test("the card grows only as tall as its parts", () => {
    const height = (svg: string) => Number(/height="(\d+)"/.exec(svg)?.[1]);
    const only = (hide: string) =>
      height(cardSvg(sampleRecap, cardOptions({ hide, show: "graph" })));
    expect(only("archetype,stats")).toBeLessThan(only("archetype"));
    expect(only("archetype,graph")).toBeLessThan(only("archetype"));
  });

  test("the archetype alone is a card of its own that still names the user", () => {
    const svg = cardSvg(sampleRecap, cardOptions({ hide: "graph,stats" }));
    expect(width(svg)).toBe(220);
    expect(svg).toContain("@octo-sample · 2026");
  });

  test("the product signs the card beside the year, not among the numbers", () => {
    const svg = cardSvg(sampleRecap);
    expect(svg).not.toContain("wrapyourgit.com");
    expect(svg).toContain(">2026</text>");
  });

  test("the neutral card ignores the options, so it tells no account from another", () => {
    expect(cardSvg(null, cardOptions({ hide: "graph" }))).toBe(cardSvg(null));
  });

  test("the neutral card shows no numbers and no diorama", () => {
    const svg = cardSvg(null);
    expect(svg).toContain("See the 2026 recap");
    expect(svg).not.toContain("data:image/webp");
    expect(svg).not.toMatch(/contributions/);
  });
});

describe("compact card", () => {
  const compact = (hide?: string) =>
    cardSvg(sampleRecap, cardOptions({ layout: "compact", hide, show: "graph" }));

  test("is 360 px wide and stacks the diorama, the numbers and the graph", () => {
    const svg = compact();
    expect(width(svg)).toBe(360);
    expect(svg).toContain("data:image/webp");
    expect(svg).toContain(">Contributions<");
    expect(svg).toContain(">1,284<");
    expect(svg.match(/<use href="#d"/g)).toHaveLength(365);
  });

  test("sets no text smaller than 11 px, since it is shown at about its own size", () => {
    const sizes = [...compact().matchAll(/font-size="(\d+)"/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
  });

  test("takes the same hide options, and grows only as tall as its parts", () => {
    const height = (svg: string) => Number(/height="(\d+)"/.exec(svg)?.[1]);
    expect(compact("graph")).not.toContain('<use href="#d"');
    expect(compact("archetype")).not.toContain("data:image/webp");
    expect(compact("stats")).not.toContain(">Contributions<");
    expect(height(compact("archetype,stats"))).toBeLessThan(height(compact()));
  });

  test("a 39-character login gives way in size rather than running into the year", () => {
    const long: RecapData = {
      ...provisionalRecap,
      profile: { ...provisionalRecap.profile, login: "a".repeat(39) },
    };
    const svg = cardSvg(long, cardOptions({ layout: "compact" }));
    const login =
      /<text x="18.0" y="36" fill="#eeeae0" font-size="(\d+)" font-weight="700"[^>]*textLength="([\d.]+)"/.exec(
        svg,
      );
    const size = Number(login?.[1]);
    const end = 18 + Number(login?.[2]);
    const mark = Number(/<rect class="c" [^>]* x="([\d.]+)" y="26.50"/.exec(svg)?.[1]);
    expect(size).toBeLessThan(16);
    expect(size).toBeGreaterThanOrEqual(11);
    expect(end).toBeLessThan(mark);
  });

  test("the neutral compact card ignores the hide options", () => {
    const neutral = cardSvg(null, cardOptions({ layout: "compact" }));
    expect(width(neutral)).toBe(360);
    expect(cardSvg(null, cardOptions({ layout: "compact", hide: "graph" }))).toBe(neutral);
    expect(neutral).toContain("See the 2026 recap");
  });
});

describe("snake", () => {
  test("eats every lit day once, one step at a time, nearest first", () => {
    const cells = [
      { week: 3, row: 2 },
      { week: 0, row: 0 },
      { week: 1, row: 0 },
    ];
    const { path, eatenAt } = snakeRoute(cells);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      const stepLength =
        Math.abs((a?.week ?? 0) - (b?.week ?? 0)) + Math.abs((a?.row ?? 0) - (b?.row ?? 0));
      expect(stepLength).toBe(1);
    }
    // From (-1, 0): (0,0) first, then (1,0), then (3,2).
    expect(eatenAt[1]).toBeLessThan(eatenAt[2] ?? 0);
    expect(eatenAt[2]).toBeLessThan(eatenAt[0] ?? 0);
    expect(path[eatenAt[0] ?? 0]).toEqual({ week: 3, row: 2 });
  });

  test("animates each day with contributions, loops, and stands still for reduced motion", () => {
    const svg = snakeSvg(sampleRecap);
    const lit = sampleRecap.contributions.calendar.filter((d) => d.count > 0).length;
    expect(svg.match(/<animate attributeName="fill"/g)).toHaveLength(lit);
    expect(svg).toContain('repeatCount="indefinite"');
    expect(svg.match(/<animateMotion /g)).toHaveLength(4);
    expect(svg).toContain("@media (prefers-reduced-motion:reduce)");
    expect(svg).toContain(".s{display:none}");
    expect(label(svg)).toContain("eaten by a snake: 186 active days");
  });

  test("a year with nothing to eat has no snake", () => {
    expect(snakeSvg(emptyRecap)).not.toContain("<animateMotion");
  });

  test("no stored recap draws the neutral card", () => {
    expect(snakeSvg(null)).toBe(cardSvg(null));
  });
});

describe("textWidth", () => {
  test("bold is wider than regular, and size scales it", () => {
    expect(textWidth("streak", 12, true)).toBeGreaterThan(textWidth("streak", 12));
    expect(textWidth("streak", 24)).toBeCloseTo(textWidth("streak", 12) * 2);
  });
});
