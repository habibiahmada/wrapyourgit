import { palette } from "../theme";

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
