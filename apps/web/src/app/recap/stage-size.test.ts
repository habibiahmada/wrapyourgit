import { describe, expect, test } from "bun:test";
import { stageBox, stageSize } from "./stage-size";

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

describe("stageBox", () => {
  test("a composition of the box's own shape covers it, cropping a pixel at most", () => {
    const box = stageBox({ width: 351, height: 760 }, stageSize(351, 760));
    expect(box.width).toBeGreaterThanOrEqual(351);
    expect(box.height).toBeGreaterThanOrEqual(760);
    // The long side is rounded to a step of 8 units, so the shape is off by a sliver.
    expect(box.width - 351).toBeLessThan(1);
    expect(box.height - 760).toBeLessThan(1);
  });

  test("a wider composition covers the height and crops the sides", () => {
    const box = stageBox({ width: 360, height: 720 }, { width: 1080, height: 1080 });
    expect(box).toEqual({ width: 720, height: 720 });
  });

  test("a taller composition covers the width and crops top and bottom", () => {
    const box = stageBox({ width: 400, height: 400 }, { width: 1080, height: 1920 });
    expect(box).toEqual({ width: 400, height: (400 * 1920) / 1080 });
  });
});
