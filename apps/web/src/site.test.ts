import { describe, expect, test } from "bun:test";
import { SITE } from "./site";

/*
 * Safe Browsing listed the site as deceptive (issue #153). A new domain whose title leads with
 * GitHub's brand, next to "Sign in with GitHub", reads as a look-alike; the product is named after
 * itself, and GitHub only as the source of the data.
 */
describe("SITE metadata", () => {
  test("the title leads with WrapYourGit", () => {
    expect(SITE.title.startsWith("WrapYourGit")).toBe(true);
  });

  test("no name, title or description calls the product a GitHub Wrapped", () => {
    for (const text of [SITE.title, SITE.description, ...SITE.alternateNames]) {
      expect(text).not.toMatch(/github wrapped/i);
    }
  });

  // Issue #189: the title says what the site is in the words people search with, as a description
  // of the product, never as its name.
  test("the title calls it a GitHub year in review", () => {
    expect(SITE.title).toContain("GitHub year in review");
  });

  test("the description says it is not affiliated with GitHub", () => {
    expect(SITE.description).toContain("not affiliated with GitHub");
  });
});
