import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { cardPng } from "@/server/card";
import { getRecap } from "@/server/recaps";

/**
 * Downloads the signed-in user's summary card as PNG. It is meant to be posted, so it renders the
 * public projection even though only the owner can fetch it here.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  const recap = await getRecap(user.id);
  const png = recap && (await cardPng(user.id, recap.syncedAt.toISOString()));
  if (!recap || !png) return new NextResponse("Build your recap first", { status: 404 });

  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="wrapyourgit-${recap.data.meta.year}-${user.login}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
