import { notFound } from "next/navigation";
import { CARD_SIZE, renderCard } from "@/server/card";
import { getPublicRecap } from "@/server/recaps";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "A WrapYourGit summary card: contributions, streak, top language and archetype";

/** Link previews for a shared recap use the same card people can download. */
export default async function Image({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const recap = await getPublicRecap(login);
  if (!recap) notFound();
  return renderCard(recap);
}
