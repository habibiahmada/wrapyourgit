import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CARD_SIZE, publicCardPng } from "@/server/card";
import { clientKey, loadPublicRecap } from "@/server/public-recaps";
import { isValidLogin } from "@/server/username";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "A WrapYourGit summary card: contributions, streak, top language and archetype";

/** Same as the page: a preview requested first may wait for, or run, the fetch. */
export const maxDuration = 120;

/**
 * Link previews use the same card people can download, built from the public recap only. The
 * lookup runs on every request, so a hidden recap stops previewing at once; only the PNG is cached.
 */
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!isValidLogin(username)) notFound();
  const result = await loadPublicRecap(username, clientKey(await headers()));
  if (result.kind !== "recap") notFound();
  const png = await publicCardPng(result.data);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
