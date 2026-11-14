import { describe, expect, test } from "bun:test";
import { sampleRecap } from "@wyg/video";
import { endScreenFor, OWNER_CARD, shareCardFor } from "./end-screen";

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

  test("a signed-in visitor already has a recap: Go to dashboard, no sign-in", () => {
    const screen = endScreenFor("public", { signedIn: true });
    expect(screen.exports).toBe(true);
    expect(screen.links).toEqual([{ label: "Go to dashboard", href: "/dashboard", route: false }]);
  });

  test("the owner keeps the files and Go to dashboard", () => {
    const screen = endScreenFor("owner");
    expect(screen.exports).toBe(true);
    expect(screen.links).toEqual([{ label: "Go to dashboard", href: "/dashboard", route: false }]);
  });
});

describe("shareCardFor", () => {
  test("the owner's card is their own, from /api/card", () => {
    expect(shareCardFor("owner", sampleRecap)).toBe(OWNER_CARD);
    expect(OWNER_CARD).toEqual({ href: "/api/card" });
  });

  test("a visitor's card is the public page's link preview, named like the owner's", () => {
    const data = withLogin("octocat");
    expect(shareCardFor("public", data)).toEqual({
      href: "/octocat/opengraph-image",
      filename: `wrapyourgit-${data.meta.year}-octocat.png`,
    });
  });

  test("an account named like a site route has no preview image to download", () => {
    const card = shareCardFor("public", withLogin("settings"));
    expect("href" in card).toBe(false);
    // The panel shows this text under the disabled button.
    expect(card).toEqual({ reason: "There is no share card for this name yet." });
  });
});
