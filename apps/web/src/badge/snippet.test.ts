import { describe, expect, test } from "bun:test";
import { imagePath, type ReadmeChoice, readmeSnippet } from "./snippet";

const SITE = "https://wrapyourgit.com";
const card: Extract<ReadmeChoice, { kind: "card" }> = {
  kind: "card",
  layout: "wide",
  side: "left",
  archetype: true,
  name: true,
  stats: true,
  graph: false,
  phoneSwitch: false,
};

describe("imagePath", () => {
  test("leaves defaults out of the query", () => {
    expect(imagePath("octocat", { kind: "badge", shows: ["contributions"] })).toBe(
      "/octocat/badge.svg",
    );
    expect(imagePath("octocat", card)).toBe("/octocat/card.svg");
    expect(imagePath("octocat", { kind: "snake" })).toBe("/octocat/snake.svg");
  });

  test("keeps the badge's values in the order picked", () => {
    expect(imagePath("octocat", { kind: "badge", shows: ["streak", "contributions"] })).toBe(
      "/octocat/badge.svg?show=streak,contributions",
    );
  });

  test("writes only the card options that differ", () => {
    expect(imagePath("octocat", { ...card, side: "right", graph: true })).toBe(
      "/octocat/card.svg?archetype=right&show=graph",
    );
    expect(imagePath("octocat", { ...card, name: false, stats: false })).toBe(
      "/octocat/card.svg?hide=name,stats",
    );
    // The side means nothing without the archetype, the name nothing without it either.
    expect(imagePath("octocat", { ...card, archetype: false, name: false, side: "right" })).toBe(
      "/octocat/card.svg?hide=archetype",
    );
    expect(imagePath("octocat", { ...card, layout: "compact", side: "right" })).toBe(
      "/octocat/card.svg?layout=compact",
    );
  });

  test("an account whose name a site route uses gets its images under /u/", () => {
    expect(imagePath("settings", { kind: "snake" })).toBe("/u/settings/snake.svg");
  });
});

describe("readmeSnippet", () => {
  test("is a Markdown image linked to the recap", () => {
    expect(readmeSnippet(SITE, "octocat", 2026, { kind: "badge", shows: ["streak"] })).toEqual({
      format: "markdown",
      text: "[![octocat's 2026 on WrapYourGit](https://wrapyourgit.com/octocat/badge.svg?show=streak)](https://wrapyourgit.com/octocat)",
    });
  });

  test("a wide card that switches on phones is HTML with <picture>", () => {
    const { format, text } = readmeSnippet(SITE, "octocat", 2026, {
      ...card,
      side: "right",
      phoneSwitch: true,
    });
    expect(format).toBe("html");
    expect(text).toContain(
      '<source media="(max-width: 600px)" srcset="https://wrapyourgit.com/octocat/card.svg?layout=compact">',
    );
    expect(text).toContain('<img src="https://wrapyourgit.com/octocat/card.svg?archetype=right"');
    expect(text).toContain('<a href="https://wrapyourgit.com/octocat">');
  });

  test("escapes ampersands in HTML", () => {
    const { text } = readmeSnippet(SITE, "octocat", 2026, {
      ...card,
      graph: true,
      stats: false,
      phoneSwitch: true,
    });
    expect(text).toContain("card.svg?hide=stats&amp;show=graph");
  });
});
