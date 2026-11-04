import { describe, expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { emptyRecap } from "./fixtures/edge-recaps";
import { sampleRecap } from "./fixtures/sample-recap";
import { congratsLetter } from "./letter";

const text = (recap: RecapData) => {
  const letter = congratsLetter(recap);
  return [letter.greeting, ...letter.paragraphs, letter.signOff].join("\n");
};

describe("congratsLetter", () => {
  test("is built from the recap's real numbers", () => {
    const letter = text(sampleRecap);
    expect(letter).toContain("Dear Sample Dev,");
    expect(letter).toContain("1,284 contributions");
    expect(letter).toContain("186 days");
    expect(letter).toContain("24 days");
    expect(letter).toContain("June");
    expect(letter).toContain("TypeScript");
    expect(letter).toContain("Builder");
  });

  test("never uses an em dash (antislop R-02)", () => {
    expect(text(sampleRecap)).not.toContain("—");
    expect(text(emptyRecap)).not.toContain("—");
  });

  test("a provisional year says 'so far'", () => {
    const provisional = { ...sampleRecap, meta: { ...sampleRecap.meta, isFinal: false } };
    expect(text(provisional)).toContain("so far");
  });

  test("skips facts that are zero or missing instead of celebrating nothing", () => {
    const letter = text(emptyRecap);
    expect(letter).not.toMatch(/\b0 contributions\b/);
    expect(letter).not.toContain("longest run");
    expect(letter).not.toContain("busiest");
    expect(letter).toContain("Your story is just beginning");
  });

  test("never names a private repository", () => {
    const privateTop: RecapData = {
      ...sampleRecap,
      repositories: {
        ...sampleRecap.repositories,
        top: sampleRecap.repositories.top.map((repo, i) =>
          i === 0 ? { ...repo, nameWithOwner: "octo/secret-client", isPrivate: true } : repo,
        ),
      },
    };
    expect(text(privateTop)).not.toContain("secret-client");
  });

  test("uses 'an' before a vowel: an Explorer, an Open sourcer", () => {
    const explorer: RecapData = {
      ...sampleRecap,
      identity: { archetype: "explorer", scores: {}, reasons: [] },
    };
    expect(text(explorer)).toContain("adds up to an Explorer.");
  });

  test("falls back to the login when there is no display name", () => {
    const noName = { ...sampleRecap, profile: { ...sampleRecap.profile, name: null } };
    expect(congratsLetter(noName).greeting).toBe("Dear @octo-sample,");
  });
});
