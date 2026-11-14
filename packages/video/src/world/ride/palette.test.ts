import { expect, test } from "bun:test";
import { mixHex } from "./palette";

/** The first mixHex, kept as the reference: the faster one must give the same string. */
function reference(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  const k = Math.max(0, Math.min(1, t));
  return `#${[0, 1, 2]
    .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * k))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

test("mixHex matches the reference across colours and amounts", () => {
  const colours = ["#000000", "#ffffff", "#0b1220", "#141e33", "#9BE9A8", "#2ea043", "#e3b341"];
  for (const a of colours)
    for (const b of colours)
      for (let i = -4; i <= 104; i++) {
        const t = i / 100 + 0.0037;
        expect(mixHex(a, b, t)).toBe(reference(a, b, t));
      }
});

test("mixHex clamps the amount and keeps odd input as the reference does", () => {
  expect(mixHex("#102030", "#405060", -3)).toBe("#102030");
  expect(mixHex("#102030", "#405060", 7)).toBe("#405060");
  expect(mixHex("#102030", "#405060", Number.NaN)).toBe(
    reference("#102030", "#405060", Number.NaN),
  );
});
