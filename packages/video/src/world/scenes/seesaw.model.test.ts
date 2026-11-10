import { expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { seesawModel } from "./seesaw.model";

function versus(last: number, current: number): RecapData {
  const prev = sampleRecap.previousYear;
  if (prev.status !== "ok") throw new Error("fixture changed");
  return {
    ...sampleRecap,
    contributions: { ...sampleRecap.contributions, total: current },
    previousYear: {
      ...prev,
      value: { ...prev.value, sameSpan: { ...prev.value.sameSpan, contributions: last } },
    },
  };
}

test("seesawModel: this year heavier tips right, change is a rounded percent", () => {
  const m = seesawModel(versus(1000, 1180));
  if ("unavailable" in m) throw new Error("expected a comparison");
  expect(m.last).toEqual({ year: 2025, value: 1000 });
  expect(m.current).toEqual({ year: 2026, value: 1180 });
  expect(m.change).toBe("+18%");
  expect(m.angle).toBeCloseTo((12 * 180) / 1180);
  expect(m.span).toBe("Jan 1 – Dec 31, both years");
});

test("seesawModel: this year lighter tips left and uses a true minus sign", () => {
  const m = seesawModel(versus(1000, 930));
  if ("unavailable" in m) throw new Error("expected a comparison");
  expect(m.change).toBe("−7%");
  expect(m.angle).toBeLessThan(0);
});

test("seesawModel: within one percent reads as the same, and stays honest about the tilt", () => {
  const m = seesawModel(versus(1000, 1004));
  if ("unavailable" in m) throw new Error("expected a comparison");
  expect(m.change).toBe("same as last year");
  const same = seesawModel(versus(1000, 1000));
  if ("unavailable" in same) throw new Error("expected a comparison");
  expect(same.angle).toBe(0);
  expect(same.change).toBe("same as last year");
});

test("seesawModel: last year at zero is new this year", () => {
  const m = seesawModel(versus(0, 300));
  if ("unavailable" in m) throw new Error("expected a comparison");
  expect(m.change).toBe("new this year");
  expect(m.angle).toBe(12);
});

test("seesawModel: both years at zero is the same, level", () => {
  const m = seesawModel(versus(0, 0));
  if ("unavailable" in m) throw new Error("expected a comparison");
  expect(m.change).toBe("same as last year");
  expect(m.angle).toBe(0);
});

test("seesawModel: the angle never passes 12 degrees either way", () => {
  const up = seesawModel(versus(1, 100000));
  const down = seesawModel(versus(100000, 1));
  if ("unavailable" in up || "unavailable" in down) throw new Error("expected a comparison");
  expect(up.angle).toBeLessThanOrEqual(12);
  expect(down.angle).toBeGreaterThanOrEqual(-12);
  expect(down.angle).toBeLessThan(-11.9);
});

test("seesawModel: unavailable last year is its own state", () => {
  expect(seesawModel(emptyRecap)).toEqual({ unavailable: true });
});
