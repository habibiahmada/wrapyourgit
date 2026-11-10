import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { rhythmModel } from "./rhythm.model";

const withWeekday = (weekday: number[]) => ({
  ...sampleRecap,
  contributions: { ...sampleRecap.contributions, weekday },
});

test("rhythmModel: seven cars Sunday to Saturday, fill relative to the busiest", () => {
  const m = rhythmModel(sampleRecap);
  expect(m.cars.map((c) => c.day)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  expect(m.cars.map((c) => c.count)).toEqual([90, 220, 240, 230, 210, 190, 104]);
  expect(m.cars[2]?.fill).toBe(1);
  expect(m.cars[0]?.fill).toBeCloseTo(90 / 240);
  expect(m.cars.filter((c) => c.busiest).map((c) => c.day)).toEqual(["Tue"]);
  expect(m.busiest).toEqual({ day: "Tuesday", count: 240 });
  expect(m.title).toBe("Tuesdays carried the most");
  expect(m.caption).toBe("contributions per weekday · Tuesday 240");
});

test("rhythmModel: a tie goes to the earlier weekday", () => {
  const m = rhythmModel(withWeekday([0, 5, 9, 9, 0, 0, 9]));
  expect(m.busiest).toEqual({ day: "Tuesday", count: 9 });
  expect(m.cars.filter((c) => c.busiest).map((c) => c.day)).toEqual(["Tue"]);
});

test("rhythmModel: all zero has no busiest car and says so", () => {
  const m = rhythmModel(withWeekday([0, 0, 0, 0, 0, 0, 0]));
  expect(m.busiest).toBeNull();
  expect(m.cars.every((c) => !c.busiest && c.fill === 0)).toBe(true);
  expect(m.title).toBe("Your week, so far");
  expect(m.caption).toBe("No contributions on any weekday yet");
});

test("rhythmModel: counts are formatted in the caption", () => {
  const m = rhythmModel(withWeekday([0, 1234, 0, 0, 0, 0, 0]));
  expect(m.caption).toBe("contributions per weekday · Monday 1,234");
});
