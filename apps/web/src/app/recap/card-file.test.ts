import { describe, expect, test } from "bun:test";
import { cardFileName } from "./card-file";

describe("cardFileName", () => {
  test("keeps the server's name", () => {
    expect(cardFileName('attachment; filename="wrapyourgit-2026-octocat.png"', "card.png")).toBe(
      "wrapyourgit-2026-octocat.png",
    );
    expect(cardFileName("attachment; filename=plain.png", "card.png")).toBe("plain.png");
  });

  test("falls back without a header, a name, or with a path in it", () => {
    expect(cardFileName(null, "card.png")).toBe("card.png");
    expect(cardFileName("inline", "card.png")).toBe("card.png");
    expect(cardFileName('attachment; filename="../evil.png"', "card.png")).toBe("card.png");
  });
});
