import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import {
  busyRecap,
  emptyRecap,
  provisionalRecap,
} from "../../../../packages/video/src/fixtures/edge-recaps";
import { sampleRecap } from "../../../../packages/video/src/fixtures/sample-recap";
import { ARCHETYPE_ART } from "./archetype-art";
import {
  BADGE_SHOWS,
  badgeContent,
  badgeShows,
  badgeSvg,
  cardOptions,
  cardSvg,
  DAYS_PER_SEGMENT,
  SNAKE_MAX,
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
    // Budget: the still diorama is about 28 KB once base64, its moving layer about 120 KB (#211),
    // the calendar about 16 KB: 168 KB measured.
    expect(left.length).toBeLessThan(185_000);
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

  test("the archetype alone is a card of its own, captioned with the year", () => {
    const svg = cardSvg(sampleRecap, cardOptions({ hide: "graph,stats" }));
    expect(width(svg)).toBe(220);
    expect(svg).toContain(">archetype · 2026<");
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

describe("cards without the login, square (#213)", () => {
  const images = {
    wide: cardSvg(sampleRecap, cardOptions({ show: "graph" })),
    compact: cardSvg(sampleRecap, cardOptions({ layout: "compact", show: "graph" })),
    alone: cardSvg(sampleRecap, cardOptions({ hide: "graph,stats" })),
    noArchetype: cardSvg(sampleRecap, cardOptions({ hide: "archetype" })),
    snake: snakeSvg(sampleRecap),
  };
  // What is drawn, without the accessible name and tooltip that rightly carry the login.
  const drawn = (svg: string) =>
    svg.replace(/ aria-label="[^"]*"/, "").replace(/<title>.*?<\/title>/, "");

  test("print no login, which the profile around them already shows", () => {
    for (const svg of Object.values(images)) {
      expect(drawn(svg)).not.toContain("octo-sample");
      expect(label(svg)).toContain("octo-sample");
    }
  });

  test("sign the header with the mark and the year instead", () => {
    for (const svg of [images.wide, images.compact, images.noArchetype, images.snake]) {
      expect(drawn(svg)).toContain(">2026</text>");
    }
  });

  test("have square frames; the badge keeps its rounded shape", () => {
    const frame = (svg: string) => /<rect x="0\.5" y="0\.5"[^>]*>/.exec(svg)?.[0] ?? "";
    for (const svg of [...Object.values(images), cardSvg(null)]) {
      expect(frame(svg)).not.toBe("");
      expect(frame(svg)).not.toContain("rx=");
    }
    expect(frame(badgeSvg(sampleRecap, badgeShows("contributions")))).toContain("rx=");
  });
});

describe("the card's moving archetype (#211)", () => {
  const motion = ARCHETYPE_ART.builder.motion;
  const cards = {
    wide: cardSvg(sampleRecap),
    compact: cardSvg(sampleRecap, cardOptions({ layout: "compact" })),
    alone: cardSvg(sampleRecap, cardOptions({ hide: "graph,stats" })),
  };
  const box = (svg: string) =>
    /<g class="ds"><image href="[^"]+" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/
      .exec(svg)
      ?.slice(1, 5);
  const layer = (svg: string) =>
    /<svg class="dm" aria-hidden="true" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" viewBox="([^"]+)" preserveAspectRatio="none">(.*?)<\/svg>/.exec(
      svg,
    );

  test("plays the dashboard's base and animated overlay where the still diorama stands", () => {
    for (const svg of Object.values(cards)) {
      const moving = layer(svg);
      expect(moving).not.toBeNull();
      expect(moving?.slice(1, 5)).toEqual(box(svg));
      const { x, y, width: w, height: h } = motion.crop;
      expect(moving?.[5]).toBe(`${x} ${y} ${w} ${h}`);
      expect(moving?.[6]).toBe(
        `<image href="${motion.base}" width="${motion.width}" height="${motion.height}"/><image href="${motion.frames}" width="${motion.width}" height="${motion.height}"/>`,
      );
    }
  });

  test("reduced motion keeps the still and drops the animation; otherwise the still steps aside", () => {
    expect(cards.wide).toContain("@media (prefers-reduced-motion:reduce){.dm{display:none}}");
    // Inside the no-preference block, past the entrance's own rules.
    expect(cards.wide).toMatch(
      /@media \(prefers-reduced-motion:no-preference\)\{(?:[^{}]*\{[^{}]*\})*\.ds\{visibility:hidden\}\}/,
    );
  });

  test("the badge and a card with no archetype carry no moving layer", () => {
    expect(cardSvg(sampleRecap, cardOptions({ hide: "archetype" }))).not.toContain('class="dm"');
    expect(cardSvg(emptyRecap)).not.toContain('class="dm"');
    expect(badgeSvg(sampleRecap, badgeShows("archetype"))).not.toContain('class="dm"');
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

  test("a 39-character login changes nothing that is drawn", () => {
    const named = (login: string): RecapData => ({
      ...provisionalRecap,
      profile: { ...provisionalRecap.profile, login },
    });
    const drawn = (svg: string) =>
      svg.replace(/ aria-label="[^"]*"/, "").replace(/<title>.*?<\/title>/, "");
    const options = cardOptions({ layout: "compact" });
    expect(drawn(cardSvg(named("a".repeat(39)), options))).toBe(
      drawn(cardSvg(named("ab"), options)),
    );
  });

  test("the neutral compact card ignores the hide options", () => {
    const neutral = cardSvg(null, cardOptions({ layout: "compact" }));
    expect(width(neutral)).toBe(360);
    expect(cardSvg(null, cardOptions({ layout: "compact", hide: "graph" }))).toBe(neutral);
    expect(neutral).toContain("See the 2026 recap");
  });
});

describe("snake", () => {
  const year = Array.from({ length: 40 }, (_, i) => ({ week: (i * 7) % 53, row: (i * 3) % 7 }));
  const stepsAreSingle = (path: { week: number; row: number }[]) =>
    path.every(
      (b, i) =>
        i === 0 ||
        Math.abs(b.week - (path[i - 1]?.week ?? 0)) + Math.abs(b.row - (path[i - 1]?.row ?? 0)) ===
          1,
    );

  test("eats every lit day exactly once, one step at a time", () => {
    const { path, eatenAt } = snakeRoute(year, "octocat/2026");
    expect(stepsAreSingle(path)).toBe(true);
    expect(new Set(eatenAt).size).toBe(year.length);
    eatenAt.forEach((step, i) => {
      expect(path[step]).toEqual(year[i]);
    });
  });

  test("wanders at random, but the same login and year always take the same route", () => {
    const a = snakeRoute(year, "octocat/2026").eatenAt;
    expect(snakeRoute(year, "octocat/2026").eatenAt).toEqual(a);
    expect(snakeRoute(year, "someone-else/2026").eatenAt).not.toEqual(a);
  });

  test("grows a segment for every three days, each in a green it ate, up to twenty", () => {
    const fills = (svg: string) =>
      [...svg.matchAll(/rx="3" fill="(#[0-9a-f]{6})" opacity="0"/g)].map((m) => m[1]);
    const segments = (svg: string) => (svg.match(/<animateMotion /g) ?? []).length;

    // The sample year has 186 lit days: 2 + 62 would be 64, so it stops at the cap.
    const busy = snakeSvg(sampleRecap);
    expect(segments(busy)).toBe(SNAKE_MAX);
    expect(fills(busy)).toHaveLength(SNAKE_MAX - 2);
    const greens = new Set(["#0e4429", "#006d32", "#26a641", "#39d353"]);
    expect(fills(busy).every((fill) => greens.has(fill ?? ""))).toBe(true);
    expect(new Set(fills(busy)).size).toBeGreaterThan(1);

    // A quiet year grows a segment per three days, under the cap.
    const twelveDays = {
      ...sampleRecap,
      contributions: {
        ...sampleRecap.contributions,
        calendar: sampleRecap.contributions.calendar.map((d, i) => ({
          ...d,
          count: i % 30 === 0 && i < 360 ? 3 : 0,
        })),
      },
    };
    expect(segments(snakeSvg(twelveDays))).toBe(2 + Math.floor(12 / DAYS_PER_SEGMENT));
  });

  test("animates each day with contributions, loops, and stands still for reduced motion", () => {
    const svg = snakeSvg(sampleRecap);
    const lit = sampleRecap.contributions.calendar.filter((d) => d.count > 0).length;
    expect(svg.match(/<animate attributeName="fill"/g)).toHaveLength(lit);
    expect(svg).toContain('repeatCount="indefinite"');
    expect(svg).toContain('<path id="route"');
    expect(svg).toContain("@media (prefers-reduced-motion:reduce)");
    expect(svg).toContain(".s{display:none}");
    expect(label(svg)).toContain("eaten by a snake: 186 active days");
    // Budget: about 190 animated squares, a segment per three days and the route, once.
    expect(svg.length).toBeLessThan(100_000);
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
