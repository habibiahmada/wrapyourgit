import { type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/export";

/** The link preview card (1200 x 630), or the card in one of the video shapes. */
export type CardShape = "card" | ExportFormat;

/** `?format=` of a card route: none is the link preview card; anything not a shape is refused. */
export function parseCardShape(param: string | null): CardShape | null {
  if (param === null) return "card";
  return Object.hasOwn(VIDEO_FORMATS, param) ? (param as ExportFormat) : null;
}

export function cardSize(shape: CardShape): { width: number; height: number } {
  if (shape === "card") return { width: 1200, height: 630 };
  const { width, height } = VIDEO_FORMATS[shape];
  return { width, height };
}

/**
 * The picture on the card: the archetype's city block (the landing's art, ADR-0022), or Cell
 * waving when the year names no archetype. An id under public/art, as a still PNG.
 */
export function cardArt(data: RecapData): string {
  const archetype = data.identity.archetype;
  return archetype ? `skin-${archetype}` : "cutout-cell-wave";
}
