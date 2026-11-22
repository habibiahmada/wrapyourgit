import { CARD_SIZE, renderSiteCard } from "@/server/card";

export const alt =
  "WrapYourGit 2026: every green square has a story. Three developer archetypes as isometric city dioramas: the Builder's site under a crane in front, the Explorer and the Night Owl behind.";
export const size = CARD_SIZE;
export const contentType = "image/png";

/** The share image for the landing page: the headline beside three archetype dioramas (#221). */
export default function OpenGraphImage() {
  return renderSiteCard();
}
