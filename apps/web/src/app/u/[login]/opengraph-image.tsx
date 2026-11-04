import { notFound } from "next/navigation";
import { CARD_SIZE, cardPng } from "@/server/card";
import { getPublicRecap } from "@/server/recaps";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "A WrapYourGit summary card: contributions, streak, top language and archetype";

/** Link previews for a shared recap use the same card people can download. */
export default async function Image({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  // The share check runs on every request; only the rendered PNG is cached.
  const shared = await getPublicRecap(login);
  if (!shared) notFound();
  const png = await cardPng(shared.userId, shared.syncedAt.toISOString());
  if (!png) notFound();
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
