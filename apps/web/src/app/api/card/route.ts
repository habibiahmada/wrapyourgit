import { toPublicRecap } from "@wyg/analytics";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { renderCard } from "@/server/card";
import { getRecap } from "@/server/recaps";

/**
 * Downloads the signed-in user's summary card as PNG. It is meant to be posted, so it renders the
 * public projection even though only the owner can fetch it here.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  const recap = await getRecap(user.id);
  if (!recap) return new NextResponse("Build your recap first", { status: 404 });

  const card = await renderCard(toPublicRecap(recap.data));
  card.headers.set(
    "Content-Disposition",
    `attachment; filename="wrapyourgit-${recap.data.meta.year}-${user.login}.png"`,
  );
  card.headers.set("Cache-Control", "private, no-store");
  return card;
}
