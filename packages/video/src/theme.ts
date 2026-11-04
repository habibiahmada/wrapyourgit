import { loadFont } from "@remotion/google-fonts/BricolageGrotesque";
import { useVideoConfig } from "remotion";

/**
 * Tokens from DESIGN.md. Text pairings are restricted to the measured ones listed there:
 * ink on persimmon (paper fails), paper on cobalt (green text fails), green text on ink only.
 */
export const palette = {
  ink: "#14130F",
  paper: "#F4EFE3",
  inkSoft: "#5C584E",
  persimmon: "#E4572E",
  cobalt: "#2B39C8",
  cell: "#39D353",
  /** GitHub's own contribution ramp, levels 1-4. Cells only, never text. */
  heat: ["#9BE9A8", "#40C463", "#30A14E", "#216E39"],
} as const;

export type FieldColor = "ink" | "paper" | "persimmon" | "cobalt";

/** Text color allowed on each field (DESIGN.md contrast table). */
export const textOn: Record<FieldColor, string> = {
  ink: palette.paper,
  paper: palette.ink,
  persimmon: palette.ink,
  cobalt: palette.paper,
};

// loadFont blocks rendering (delayRender) until the faces are ready, so Lambda never
// captures a frame in the fallback font.
const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });

export { fontFamily };

/** 1% of the shorter side. All sizes derive from it so every format scales the same way. */
export function useUnit(): number {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 100;
}

/** "1,284" up to 10,000, then "12.4k" (scene-system rule 4). */
export function formatCount(value: number): string {
  if (value < 10_000) return value.toLocaleString("en-US");
  return `${(value / 1000).toFixed(value < 100_000 ? 1 : 0)}k`;
}

/** Cubic ease-out for interpolate(); Remotion's Easing isn't re-exported in this version. */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
