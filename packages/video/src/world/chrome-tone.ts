import { palette } from "../theme";
import { cardOpacity } from "./fade";
import type { Timeline } from "./timeline";

export type Tone = "light" | "dark";

/**
 * How dark the page behind the chrome is, 0 (light) to 1 (dark). Dark stops contribute their own
 * card opacity, so the chrome crossfades on exactly the timing of the cards and never flips
 * abruptly mid-move.
 */
export function chromeDarkness(tones: Tone[], frame: number, timeline: Timeline): number {
  let dark = 0;
  tones.forEach((tone, i) => {
    if (tone === "dark") dark += cardOpacity(i, frame, timeline);
  });
  return Math.min(1, Math.max(0, dark));
}

const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);

/** Linear mix of two #rrggbb colours, `t` 0 giving `a`. */
export function mixHex(a: string, b: string, t: number): string {
  const c = (i: number) =>
    Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${c(0)}${c(1)}${c(2)}`;
}

/** Ink on light stops, paper on dark ones, blended by `darkness`. */
export const chromeInk = (darkness: number) => mixHex(palette.ink, palette.paper, darkness);
