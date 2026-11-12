import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { cardPng } from "@/server/card";
import { parseCardShape } from "@/server/card-shape";
import { getRecap } from "@/server/recaps";

/**
 * Downloads the signed-in user's summary card as PNG: the link preview card, or one of the video
 * shapes with `?format=9x16` and the like. It is meant to be posted, so it renders the public
 * projection even though only the owner can fetch it here.
 */
export async function GET(request: NextRequest) {
  const shape = parseCardShape(request.nextUrl.searchParams.get("format"));
  if (!shape) return new NextResponse("Unknown card size", { status: 400 });
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  const recap = await getRecap(user.id);
  const png = recap && (await cardPng(user.id, recap.syncedAt.toISOString(), shape));
  if (!recap || !png) return new NextResponse("Build your recap first", { status: 404 });

  const suffix = shape === "card" ? "" : `-${shape}`;
  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="wrapyourgit-${recap.data.meta.year}-${user.login}${suffix}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
