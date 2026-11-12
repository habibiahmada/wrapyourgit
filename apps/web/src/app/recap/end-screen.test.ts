import { describe, expect, test } from "bun:test";
import { sampleRecap } from "@wyg/video";
import { cardLink, endScreenFor, OWNER_CARD, shareCardFor } from "./end-screen";

const withLogin = (login: string) => ({
  ...sampleRecap,
  profile: { ...sampleRecap.profile, login },
});

describe("endScreenFor", () => {
  test("a visitor gets the files and the two ways to a recap of their own", () => {
    const screen = endScreenFor("public");
    expect(screen.exports).toBe(true);
    expect(screen.links).toEqual([
      { label: "Make your own", href: "/", route: false },
      { label: "Sign in for your full recap", href: "/api/auth/signin", route: true },
    ]);
  });

  test("the owner keeps the files and Go to dashboard", () => {
    const screen = endScreenFor("owner");
    expect(screen.exports).toBe(true);
    expect(screen.links).toEqual([{ label: "Go to dashboard", href: "/dashboard", route: false }]);
  });
});

describe("shareCardFor", () => {
  test("the owner's card is their own, from /api/card, in the chosen shape", () => {
    expect(shareCardFor("owner", sampleRecap)).toBe(OWNER_CARD);
    expect(OWNER_CARD).toEqual({ href: "/api/card" });
    expect(cardLink(OWNER_CARD, "9x16")).toEqual({ href: "/api/card?format=9x16" });
  });

  test("a visitor's card is the public card route, in the chosen shape, named like the owner's", () => {
    const data = withLogin("octocat");
    const card = shareCardFor("public", data);
    expect(card).toEqual({
      href: "/octocat/card",
      filename: `wrapyourgit-${data.meta.year}-octocat`,
    });
    expect(cardLink(card, "1x1")).toEqual({
      href: "/octocat/card?format=1x1",
      filename: `wrapyourgit-${data.meta.year}-octocat-1x1.png`,
    });
  });

  test("an account named like a site route has no card to download", () => {
    const card = shareCardFor("public", withLogin("settings"));
    expect("href" in card).toBe(false);
    expect(card).toEqual({ reason: "There is no share card for this name yet." });
    expect(cardLink(card, "4x5")).toBeNull();
  });
});
