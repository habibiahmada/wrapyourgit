import { describe, expect, test } from "bun:test";
import { withoutPrivateNames } from "@wyg/analytics";
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

  test("keeps timezone and commit hours: only names are hidden", () => {
    const fixture = withPrivate();
    const hidden = storyData(fixture, false);
    expect(hidden.meta.timezone).toBe(fixture.meta.timezone);
    expect(hidden.contributions.hourly).toEqual(fixture.contributions.hourly);
    expect(JSON.stringify(hidden)).not.toContain(SECRET);
  });

  test("returns the same object when the answer is yes", () => {
    const fixture = withPrivate();
    expect(storyData(fixture, true)).toBe(fixture);
  });
});

describe("hasPrivateNames", () => {
  test("is false for a recap with no private repository anywhere", () => {
    // The raw sample names private repos, so strip them first; timezone and hours still differ
    // from the public view and must not count.
    expect(hasPrivateNames(withoutPrivateNames(sampleRecap))).toBe(false);
  });

  test("is true with a private top repository and false after the public projection", () => {
    const fixture = withPrivate();
    expect(hasPrivateNames(fixture)).toBe(true);
    expect(hasPrivateNames(withoutPrivateNames(fixture))).toBe(false);
  });
});

describe("hasPrivateNames beyond the top lists", () => {
  const repo = { ...sampleRecap.repositories.top[0], nameWithOwner: SECRET, isPrivate: true };
  const publicBase = () => withoutPrivateNames(sampleRecap);

  test("is true for a private repository only in community.mostForked", () => {
    const base = publicBase();
    const data = { ...base, community: { ...base.community, mostForked: repo } };
    expect(hasPrivateNames(data as typeof base)).toBe(true);
  });

  test("is true for a private starred repository", () => {
    const base = publicBase();
    if (base.starred.status !== "ok") throw new Error("sampleRecap starred is unavailable");
    const data = {
      ...base,
      starred: { ...base.starred, value: { ...base.starred.value, top: [repo] } },
    };
    expect(hasPrivateNames(data as typeof base)).toBe(true);
  });

  test("an unavailable starred metric neither throws nor gives true", () => {
    const base = publicBase();
    const data = { ...base, starred: { status: "unavailable", reason: "test" } };
    expect(hasPrivateNames(data as unknown as typeof base)).toBe(false);
  });

  test("storyData(false) hides a private name in community.mostStarred", () => {
    const base = publicBase();
    const data = { ...base, community: { ...base.community, mostStarred: repo } };
    expect(JSON.stringify(storyData(data as typeof base, false))).not.toContain(SECRET);
  });
});
