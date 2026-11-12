import type { RecapData } from "@wyg/schema";

/**
 * The picture on the share card: the archetype's city block (the landing's art, ADR-0022), or Cell
 * waving when the year names no archetype. An id under public/art, as a still PNG.
 */
export function cardArt(data: RecapData): string {
  const archetype = data.identity.archetype;
  return archetype ? `skin-${archetype}` : "cutout-cell-wave";
}
