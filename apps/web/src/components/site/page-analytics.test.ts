import { describe, expect, test } from "bun:test";
import { stripUrl } from "./page-analytics";

describe("stripUrl", () => {
  test("keeps the page and drops its query string and fragment", () => {
    const event = stripUrl({
      type: "pageview",
      url: "https://wrapyourgit.com/settings?delete=unconfirmed#danger",
    });
    expect(event.url).toBe("https://wrapyourgit.com/settings");
    expect(event.type).toBe("pageview");
  });

  test("leaves a plain address as it is", () => {
    expect(stripUrl({ type: "pageview", url: "https://example.dev/octocat" }).url).toBe(
      "https://example.dev/octocat",
    );
  });
});
