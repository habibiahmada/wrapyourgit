import { headers } from "next/headers";
import { CARD_SIZE, publicCardPng, siteCardPng } from "@/server/card";
import { requestIsHuman } from "@/server/human";
import { clientKey, loadPublicRecap } from "@/server/public-recaps";
import { isValidLogin } from "@/server/username";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "A WrapYourGit summary card: contributions, streak, top language and archetype";

/** Same as the page: with the check off, a preview requested first may wait for, or run, the fetch. */
export const maxDuration = 120;

/**
 * Link previews use the same card people can download, built from the public recap only. The
 * lookup runs on every request, so a hidden recap stops previewing at once; only the PNG is cached.
 * Every page under this segment advertises this image, so an address with no recap to show
 * (invalid, hidden, missing, organisation, busy, limited, error) gets the site's own card rather
 * than a 404: a broken preview would be cached by crawlers, and the site card reveals nothing.
 *
 * A crawler is not a person (ADR-0026): with the check on, a preview never starts a fetch. It
 * shows the stored recap's card, or the site's card for a name nobody has opened yet.
 */
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const result = isValidLogin(username)
    ? await loadPublicRecap(username, clientKey(await headers()), await requestIsHuman(false))
    : null;
  const png = result?.kind === "recap" ? await publicCardPng(result.data) : await siteCardPng();
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
