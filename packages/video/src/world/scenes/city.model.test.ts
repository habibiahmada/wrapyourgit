import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { cityModel } from "./city.model";

const withMeta = (total: number, isFinal: boolean) => ({
  ...sampleRecap,
  meta: { ...sampleRecap.meta, isFinal },
  contributions: { ...sampleRecap.contributions, total },
});

test("cityModel: the year's total and whether the year is over", () => {
  expect(cityModel(withMeta(1284, true))).toEqual({
    total: 1284,
    final: true,
    headline: "This year you made",
    caption: "contributions · one building per day",
    legend: null,
  });
});

test("cityModel: a year still running is not final", () => {
  expect(cityModel(withMeta(312, false))).toEqual({
    total: 312,
    final: false,
    headline: "This year so far you made",
    caption: "contributions · one building per day",
    legend: "not yet: days still to come",
  });
});

test("cityModel: an empty year is a real zero, not unavailable", () => {
  expect(cityModel(withMeta(0, true))).toMatchObject({ total: 0, final: true });
});
