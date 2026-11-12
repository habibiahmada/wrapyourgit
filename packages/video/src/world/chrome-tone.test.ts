import { expect, test } from "bun:test";
import { palette } from "../theme";
import { chromeInk, mixHex } from "./chrome-tone";

test("chromeInk: ink when light, paper when dark, a blend between", () => {
  expect(chromeInk(0)).toBe(palette.ink.toLowerCase());
  expect(chromeInk(1)).toBe(palette.paper.toLowerCase());
  expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
});
