import { fitFontSize } from "../../heat";
import { CHROME_REF, FOOTER_BOTTOM, FOOTER_SIZE, PROGRESS_HEIGHT } from "../chrome-size";

/** Scenes draw in a space 1000 units wide; `sceneHeight` is its height for a frame's size. */
export const SCENE_WIDTH = 1000;

type Size = { width: number; height: number };

export function sceneHeight(size: Size): number {
  return (SCENE_WIDTH * size.height) / size.width;
}

export type LabelWeight = 400 | 700 | 800;
export type LabelAnchor = "start" | "middle" | "end";

/** Average glyph width in em of the project font per weight; capitals run wider still. */
const CHAR_WIDTH: Record<LabelWeight, number> = { 400: 0.56, 700: 0.62, 800: 0.68 };
const CAPS_EXTRA = 0.08;

function charWidth(text: string, weight: LabelWeight): number {
  const caps = /[A-Z]/.test(text) && text === text.toUpperCase();
  return CHAR_WIDTH[weight] + (caps ? CAPS_EXTRA : 0);
}

/** Estimated width of `text` set at `size` (any unit; the result is in the same one). */
export function labelWidth(text: string, size: number, weight: LabelWeight): number {
  return text.length * charWidth(text, weight) * size;
}

/** Largest font size, at most `size`, at which `text` fits `maxWidth` on one line. */
export function labelFontSize(
  text: string,
  size: number,
  weight: LabelWeight,
  maxWidth: number,
): number {
  return fitFontSize(text, maxWidth, size, charWidth(text, weight));
}

/**
 * Width a label anchored at x can take without leaving the scene: both sides of x for "middle",
 * the right of it for "start", the left for "end". Never more than an explicit `maxWidth`.
 */
export function labelRoom(x: number, anchor: LabelAnchor, maxWidth = Infinity): number {
  const room =
    anchor === "middle"
      ? 2 * Math.min(x, SCENE_WIDTH - x)
      : anchor === "start"
        ? SCENE_WIDTH - x
        : x;
  return Math.max(0, Math.min(room, maxWidth));
}

/** Extra clearance between the chrome and a scene's content, in Chrome's reference px. */
const CLEARANCE = 24;
/** Line box of the copyright line relative to its font size. */
const FOOTER_LINE = 1.25;

/**
 * Scene units to keep clear at the top (progress bar) and bottom (copyright line), derived from
 * Chrome's sizes, which scale with the frame's shorter side while scene units scale with its width.
 */
export function safeArea(size: Size): { top: number; bottom: number } {
  const unitsPerRef = Math.min(size.width, size.height) / CHROME_REF / (size.width / SCENE_WIDTH);
  return {
    top: (PROGRESS_HEIGHT + CLEARANCE) * unitsPerRef,
    bottom: (FOOTER_BOTTOM + FOOTER_SIZE * FOOTER_LINE + CLEARANCE) * unitsPerRef,
  };
}
