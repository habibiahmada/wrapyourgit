import { CARD_SIZE, renderSiteCard } from "@/server/card";

export const alt =
  "WrapYourGit: every green square has a story. Cell waving in front of snapshots of a workshop, fireworks and mountains.";
export const size = CARD_SIZE;
export const contentType = "image/png";

/** The share image for the landing page: the headline and the hero cast, on ink. */
export default function OpenGraphImage() {
  return renderSiteCard();
}
