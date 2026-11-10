import type { ArchetypeId, RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "../../copy";
import { type LabelWeight, labelFontSize } from "./fit";

export const ARCHETYPE_INTRO = "This year you were";
/** The null state: say what is missing rather than force a label. */
export const ARCHETYPE_NONE = "Not enough activity to name your style yet";
export const MAX_REASONS = 3;

export type ArchetypeModel = {
  id: ArchetypeId;
  title: string;
  intro: string;
  reasons: string[];
};

/** Null when no archetype's minimum was met: the stage then shows Cell thinking, alone. */
export function archetypeModel(data: RecapData): ArchetypeModel | null {
  const { archetype, reasons } = data.identity;
  if (!archetype) return null;
  return {
    id: archetype,
    title: ARCHETYPE_LABELS[archetype] ?? NO_ARCHETYPE,
    intro: ARCHETYPE_INTRO,
    reasons: reasons.slice(0, MAX_REASONS),
  };
}

/**
 * Splits `text` in two at the space nearest its middle when it would have to shrink below `floor`
 * to fit `maxWidth` on one line; otherwise (or with no space to break at) returns it whole.
 */
export function wrapLines(
  text: string,
  size: number,
  weight: LabelWeight,
  maxWidth: number,
  floor: number,
): string[] {
  if (labelFontSize(text, size, weight, maxWidth) >= floor) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  if (best < 0) return [text];
  return [text.slice(0, best), text.slice(best + 1)];
}
