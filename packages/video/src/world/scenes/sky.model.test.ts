import { expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { countText, MAX_STARS, skyModel } from "./sky.model";

const withCommunity = (c: Partial<RecapData["community"]>): RecapData => ({
  ...sampleRecap,
  community: { ...sampleRecap.community, ...c },
});

test("skyModel: sample uses the stars gained, draws up to 80 and labels forks gained", () => {
  const m = skyModel(sampleRecap);
  expect(m.stars).toEqual({ value: 128, label: "stars earned this year", estimated: false });
  expect(m.forks).toEqual({ value: 12, label: "forks this year", estimated: false });
  expect(m.drawn).toBe(MAX_STARS);
});

test("skyModel: fewer stars than the cap are all drawn", () => {
  const m = skyModel(withCommunity({ starsGained: { status: "ok", value: 7, estimated: false } }));
  expect(m.drawn).toBe(7);
});

test("skyModel: estimated values keep the flag", () => {
  const m = skyModel(
    withCommunity({
      starsGained: { status: "ok", value: 900, estimated: true },
      forksGained: { status: "ok", value: 30, estimated: true },
    }),
  );
  expect(m.stars.estimated).toBe(true);
  expect(m.forks.estimated).toBe(true);
});

test("skyModel: unavailable gains fall back to the totals with their own labels", () => {
  const m = skyModel(
    withCommunity({
      totalStars: 412,
      totalForks: 37,
      starsGained: { status: "unavailable", reason: "x" },
      forksGained: { status: "unavailable", reason: "x" },
    }),
  );
  expect(m.stars).toEqual({ value: 412, label: "stars on your repositories", estimated: false });
  expect(m.forks).toEqual({ value: 37, label: "forks in total", estimated: false });
  expect(m.drawn).toBe(MAX_STARS);
});

test("skyModel: singular wording", () => {
  const m = skyModel(
    withCommunity({
      starsGained: { status: "ok", value: 1, estimated: false },
      forksGained: { status: "ok", value: 1, estimated: false },
    }),
  );
  expect(m.stars.label).toBe("star earned this year");
  expect(m.forks.label).toBe("fork this year");
  expect(m.drawn).toBe(1);
  const t = skyModel(
    withCommunity({
      totalStars: 1,
      totalForks: 1,
      starsGained: { status: "unavailable", reason: "x" },
      forksGained: { status: "unavailable", reason: "x" },
    }),
  );
  expect(t.stars.label).toBe("star on your repositories");
  expect(t.forks.label).toBe("fork in total");
});

test("skyModel: zero stars is a dark sky with 'No stars yet'", () => {
  const m = skyModel(emptyRecap);
  expect(m.stars.value).toBe(0);
  expect(m.stars.label).toBe("No stars yet");
  expect(m.drawn).toBe(0);
  expect(m.forks).toEqual({ value: 0, label: "forks this year", estimated: false });
});

test('skyModel: zero gained says "No stars this year", even when stars are owned', () => {
  const m = skyModel(
    withCommunity({ totalStars: 50, starsGained: { status: "ok", value: 0, estimated: false } }),
  );
  expect(m.stars.label).toBe("No stars this year");
  expect(m.drawn).toBe(0);
});

test("countText: says 'about' for estimates and compacts big numbers", () => {
  expect(countText(128, false)).toBe("128");
  expect(countText(12_906, true)).toBe("about 12.9k");
});
