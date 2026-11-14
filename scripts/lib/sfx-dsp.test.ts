import { describe, expect, test } from "bun:test";
import { biquad, circular, equalize, rng, room, SAMPLE_RATE, seedOf, strike } from "./sfx-dsp";

const rms = (x: Float32Array, from = 0, to = x.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += (x[i] ?? 0) ** 2;
  return Math.sqrt(s / (to - from));
};
const sine = (hz: number, seconds: number) =>
  Float32Array.from({ length: seconds * SAMPLE_RATE }, (_, i) =>
    Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE),
  );

describe("sfx dsp", () => {
  test("noise is the same for a seed and differs between sounds", () => {
    const a = rng(seedOf("rails"));
    const b = rng(seedOf("rails"));
    const c = rng(seedOf("chug"));
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });

  test("a low-pass keeps the lows and drops the highs", () => {
    const low = rms(biquad(sine(100, 0.5), "lowpass", 1000), 2000);
    const high = rms(biquad(sine(10_000, 0.5), "lowpass", 1000), 2000);
    expect(low).toBeGreaterThan(0.6);
    expect(high).toBeLessThan(0.02);
  });

  test("shelves and a peak lift or cut their own band and leave the others", () => {
    const level = (hz: number, band: Parameters<typeof equalize>[1]) =>
      20 * Math.log10(rms(equalize(sine(hz, 0.5), band), 4000));
    const flat = 20 * Math.log10(Math.SQRT1_2);
    expect(level(60, { kind: "lowshelf", hz: 160, db: -4 }) - flat).toBeCloseTo(-4, 0);
    expect(level(5000, { kind: "lowshelf", hz: 160, db: -4 }) - flat).toBeCloseTo(0, 0);
    expect(level(12_000, { kind: "highshelf", hz: 4000, db: 5 }) - flat).toBeCloseTo(5, 0);
    expect(level(200, { kind: "highshelf", hz: 4000, db: 5 }) - flat).toBeCloseTo(0, 0);
    expect(level(2500, { kind: "peak", hz: 2500, db: 2, q: 0.8 }) - flat).toBeCloseTo(2, 0);
    expect(level(100, { kind: "peak", hz: 2500, db: 2, q: 0.8 }) - flat).toBeCloseTo(0, 0);
  });

  test("a struck object rings and dies away", () => {
    const out = new Float32Array(SAMPLE_RATE);
    strike(out, 0, [{ hz: 440, decay: 20, gain: 1 }]);
    expect(rms(out, 0, 2205)).toBeGreaterThan(rms(out, 22_050, 24_255) * 50);
  });

  test("the room leaves a dry signal alone at mix 0 and gives an impulse a decaying tail", () => {
    const impulse = new Float32Array(SAMPLE_RATE * 2);
    impulse[0] = 1;
    expect(room(impulse, { size: 0.5, mix: 0 })).toEqual(impulse);
    const tail = room(impulse, { size: 0.5, mix: 1 });
    expect(rms(tail, 2000, 22_050)).toBeGreaterThan(0);
    expect(rms(tail, 66_150, 88_200)).toBeLessThan(rms(tail, 2000, 22_050) / 10);
  });

  test("a circular loop runs from its last sample into its first as the source ran on", () => {
    const noise = rng(1);
    const x = Float32Array.from({ length: 1200 }, () => noise());
    const y = circular(x, 1000, 100);
    expect(y.length).toBe(1000);
    expect(y[0]).toBe(x[1000]);
    expect(y.slice(100)).toEqual(x.slice(100, 1000));
  });
});
