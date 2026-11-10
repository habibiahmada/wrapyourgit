import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { busiestModel } from "./busiest.model";

const withBusiest = (busiestDay: { date: string; count: number } | null) => ({
  ...sampleRecap,
  contributions: { ...sampleRecap.contributions, busiestDay },
});

test("busiestModel: short date, UTC weekday and the count", () => {
  expect(busiestModel(withBusiest({ date: "2026-03-14", count: 57 }))).toEqual({
    date: "Mar 14",
    weekday: "Saturday",
    count: 57,
    headline: "busiest day",
    detail: "Saturday, Mar 14 · 57 contributions",
  });
});

test("busiestModel: no busiest day is null", () => {
  expect(busiestModel(withBusiest(null))).toBeNull();
});

test("busiestModel: sample recap has one", () => {
  expect(busiestModel(sampleRecap)).not.toBeNull();
});

test("busiestModel: one contribution is singular", () => {
  expect(busiestModel(withBusiest({ date: "2026-03-15", count: 1 }))?.detail).toBe(
    "Sunday, Mar 15 · 1 contribution",
  );
});
