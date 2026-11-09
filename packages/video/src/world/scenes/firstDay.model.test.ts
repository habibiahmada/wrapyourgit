import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { firstDayModel } from "./firstDay.model";

const withCalendar = (calendar: { date: string; count: number }[]) => ({
  ...sampleRecap,
  contributions: { ...sampleRecap.contributions, calendar },
});

test("firstDayModel: the first day with a count, short date and UTC weekday", () => {
  const data = withCalendar([
    { date: "2026-01-01", count: 0 },
    { date: "2026-01-02", count: 0 },
    { date: "2026-01-03", count: 4 },
    { date: "2026-01-04", count: 9 },
  ]);
  expect(firstDayModel(data)).toEqual({ date: "Jan 3", weekday: "Saturday" });
});

test("firstDayModel: an empty year is null", () => {
  const data = withCalendar([
    { date: "2026-01-01", count: 0 },
    { date: "2026-01-02", count: 0 },
  ]);
  expect(firstDayModel(data)).toBeNull();
  expect(firstDayModel(withCalendar([]))).toBeNull();
});

test("firstDayModel: sample recap has a first day", () => {
  expect(firstDayModel(sampleRecap)).not.toBeNull();
});
