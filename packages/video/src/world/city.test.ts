import { expect, test } from "bun:test";
import { sampleRecap } from "../fixtures/sample-recap";
import { buildCity, cityBounds, isoPoint, type Plot, plotHeight } from "./city";
import { withCalendar, withMeta, withYear } from "./test-fixtures";

test("one plot per day of the edition year, Jan 1 first", () => {
  const city = buildCity(sampleRecap);
  expect(city.plots).toHaveLength(365);
  expect(city.plots[0]?.date).toBe("2026-01-01");
  expect(city.plots[364]?.date).toBe("2026-12-31");
});

test("weeks are columns and weekdays rows, like the GitHub graph", () => {
  const city = buildCity(sampleRecap);
  expect(city.plots[0]).toMatchObject({ col: 0, row: 4 }); // 2026-01-01 is a Thursday
  expect(city.plots[3]).toMatchObject({ col: 1, row: 0 }); // Sunday Jan 4
});

test("days after periodEnd are not-yet while the recap is provisional, zero days stay zero", () => {
  const data = withMeta(
    withCalendar(sampleRecap, { "2026-03-01": 3, "2026-05-05": 2, "2026-11-20": 50 }),
    { periodEnd: "2026-11-09", isFinal: false },
  );
  const city = buildCity(data);
  expect(city.plots.find((p) => p.date === "2026-11-10")?.state).toBe("not-yet");
  const zeros = city.plots.filter((p) => p.state === "zero");
  expect(zeros.length).toBeGreaterThan(0);
  expect(zeros.every((p) => p.date <= "2026-11-09")).toBe(true);
  expect(city.plots.some((p) => p.state === "active")).toBe(true);
  // A count dated after periodEnd must not leak into the city.
  const late = city.plots.find((p) => p.date === "2026-11-20");
  expect(late).toMatchObject({ state: "not-yet", count: 0 });
  expect(city.maxCount).toBe(3);
  expect(city.lastDataIndex).toBe(city.plots.findIndex((p) => p.date === "2026-11-09"));
});

test("a final recap has no not-yet plots and ends on Dec 31", () => {
  const city = buildCity(withMeta(sampleRecap, { periodEnd: "2026-12-31", isFinal: true }));
  expect(city.plots.some((p) => p.state === "not-yet")).toBe(false);
  expect(city.lastDataIndex).toBe(364);
});

test("leap year 2028 has 366 plots", () => {
  expect(buildCity(withYear(sampleRecap, 2028)).plots).toHaveLength(366);
});

test("busiest is the highest count, earliest on a tie; tallest building", () => {
  const city = buildCity(
    withCalendar(sampleRecap, { "2026-03-12": 38, "2026-07-01": 38, "2026-02-02": 5 }),
  );
  expect(city.plots[city.busiestIndex ?? -1]?.date).toBe("2026-03-12");
  const tallest = Math.max(...city.plots.map((p) => plotHeight(p, city.maxCount)));
  expect(plotHeight(city.plots[city.busiestIndex ?? 0] as Plot, city.maxCount)).toBe(tallest);
});

test("busiestIndex follows the busiestDay metric, not its own scan", () => {
  const data = withCalendar(sampleRecap, { "2026-03-12": 38, "2026-07-01": 38 });
  const forced = {
    ...data,
    contributions: { ...data.contributions, busiestDay: { date: "2026-07-01", count: 38 } },
  };
  const city = buildCity(forced);
  expect(city.plots[city.busiestIndex ?? -1]?.date).toBe("2026-07-01");
  expect(city.maxCount).toBe(38);
});

test("an empty year: no busiest, no first active day, all heights finite", () => {
  const city = buildCity(withCalendar(sampleRecap, {}));
  expect(city.busiestIndex).toBeNull();
  expect(city.firstActiveIndex).toBeNull();
  expect(city.plots.every((p) => Number.isFinite(plotHeight(p, city.maxCount)))).toBe(true);
});

test("isoPoint projects columns and rows onto the diamond grid", () => {
  expect(isoPoint(3, 1)).toEqual({ x: 2, y: 2 });
});

test("cityBounds includes the tallest building above the top corner", () => {
  const city = buildCity(withCalendar(sampleRecap, { "2026-01-01": 10 }));
  const b = cityBounds(city);
  expect(b.minY).toBeLessThanOrEqual(isoPoint(0, 4).y - 8);
  expect(b.maxX).toBeGreaterThan(b.minX);
});
