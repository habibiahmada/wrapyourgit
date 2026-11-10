import { describe, expect, test } from "bun:test";
import { toPublicRecap } from "@wyg/analytics";
import { sampleRecap } from "@wyg/video";
import { publicWorld } from "./public-world";

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

describe("publicWorld", () => {
  test("names no private repository and leaves the letter out", () => {
    const world = publicWorld(withPrivate());
    expect(JSON.stringify(world.data)).not.toContain(SECRET);
    expect(world.letter).toBe(false);
  });

  test("is the public projection even when given the owner's full data (they chose Show)", () => {
    const fixture = withPrivate();
    const world = publicWorld(fixture);
    expect(world.data).toEqual(toPublicRecap(fixture));
    expect(world.data.meta.timezone).toBe("UTC");
    expect(world.data.contributions.hourly.status).toBe("unavailable");
  });

  test("keeps every count and is unchanged by a second pass", () => {
    const fixture = withPrivate();
    const once = publicWorld(fixture).data;
    expect(once.contributions.total).toBe(fixture.contributions.total);
    expect(publicWorld(once).data).toEqual(once);
  });
});
