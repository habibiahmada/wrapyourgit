import type { ArchetypeId, RecapData } from "@wyg/schema";

/**
 * The archetypes on the site's own card, front first: the dioramas the dashboard and the README
 * card show (#221). Each is `skin-<id>` under public/art.
 */
export const SITE_CARD_ARCHETYPES: readonly ArchetypeId[] = ["builder", "explorer", "night-owl"];

/**
 * The picture on the share card: the archetype's city block (the landing's art, ADR-0022), or Cell
 * waving when the year names no archetype. An id under public/art, as a still PNG.
 */
export function cardArt(data: RecapData): string {
  const archetype = data.identity.archetype;
  return archetype ? `skin-${archetype}` : "cutout-cell-wave";
}
