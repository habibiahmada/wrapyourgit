import { describe, expect, test } from "bun:test";
import { toPublicRecap } from "@wyg/analytics";
import { sampleRecap } from "@wyg/video";
import { hasPrivateNames, storyData } from "./projection";

const SECRET = "octo/secret-client";
const withPrivate = () => {
  const [first, ...rest] = sampleRecap.repositories.top;
  if (!first) throw new Error("sampleRecap has no top repository");
  return {
    ...sampleRecap,
    repositories: {
      ...sampleRecap.repositories,
      top: [{ ...first, nameWithOwner: SECRET, isPrivate: true }, ...rest],
    },
  };
};

describe("storyData", () => {
  test("hides private names but keeps every number when the answer is no", () => {
    const fixture = withPrivate();
    const hidden = storyData(fixture, false);
    expect(JSON.stringify(hidden)).not.toContain(SECRET);
    expect(hidden.contributions.total).toBe(fixture.contributions.total);
  });

  test("returns the same object when the answer is yes", () => {
    const fixture = withPrivate();
    expect(storyData(fixture, true)).toBe(fixture);
  });
});

describe("hasPrivateNames", () => {
  test("is true with a private top repository and false after the public projection", () => {
    const fixture = withPrivate();
    expect(hasPrivateNames(fixture)).toBe(true);
    expect(hasPrivateNames(toPublicRecap(fixture))).toBe(false);
  });
});
