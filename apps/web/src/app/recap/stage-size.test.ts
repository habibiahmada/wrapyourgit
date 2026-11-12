import { describe, expect, test } from "bun:test";
import { stageSize } from "./stage-size";

describe("stageSize", () => {
  test("a phone gets a composition of its own shape, 1080 across", () => {
    const size = stageSize(390, 844);
    expect(size.width).toBe(1080);
    expect(Math.abs(size.height / size.width - 844 / 390)).toBeLessThan(0.01);
  });

  test("a laptop gets one 1080 high", () => {
    const size = stageSize(1440, 900);
    expect(size.height).toBe(1080);
    expect(Math.abs(size.width / size.height - 1440 / 900)).toBeLessThan(0.01);
  });

  test("the long side is a multiple of 8", () => {
    expect(stageSize(390, 844).height % 8).toBe(0);
  });

  test("extreme shapes are held to 21:9 either way", () => {
    expect(stageSize(3440, 900).width).toBeLessThanOrEqual(Math.ceil((1080 * 21) / 9 / 8) * 8);
    expect(stageSize(300, 1400).height).toBeLessThanOrEqual(Math.ceil((1080 * 21) / 9 / 8) * 8);
  });

  test("a square or zero-sized window does not break", () => {
    expect(stageSize(800, 800)).toEqual({ width: 1080, height: 1080 });
    expect(stageSize(0, 0)).toEqual({ width: 1080, height: 1920 });
  });
});
