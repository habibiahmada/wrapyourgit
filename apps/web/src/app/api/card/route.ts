import { cardFileName } from "@wyg/video/file-name";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { cardPng, publicCardPng } from "@/server/card";
import { cardKind } from "@/server/owner-card";
import { loadPublicRecap, lookupKey } from "@/server/public-recaps";
import { getRecap } from "@/server/recaps";

const text = (body: string, status: number) => new NextResponse(body, { status });

/**
 * Downloads one of the signed-in owner's two summary cards as PNG (owner-card.ts): by default the
 * share card, built from their public recap like their link preview; with `?with=private`, their
 * own numbers, which count private work and say so on the card.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return text("Sign in first", 401);
  const recap = await getRecap(user.id);
  if (!recap) return text("Build your recap first", 404);

  const kind = cardKind(new URL(request.url).searchParams.get("with"));
  let png: Uint8Array<ArrayBuffer> | null;
  if (kind === "private") {
    png = await cardPng(user.id, recap.syncedAt.toISOString());
  } else {
    // A signed-in owner counts as a person, and the lookup counts against them (lookupKey), like
    // any of their visits.
    const result = await loadPublicRecap(user.login, lookupKey(request.headers, user.id), true);
    switch (result.kind) {
      case "recap":
        png = await publicCardPng(result.data);
        break;
      case "hidden":
        return text("Your public recap is hidden. Show it again in Settings to download it.", 409);
      case "busy":
      case "limited":
        return text("Your share card isn't ready yet. Try again in a few minutes.", 503);
      default:
        return text("Your share card isn't available right now.", 503);
    }
  }
  if (!png) return text("Build your recap first", 404);

  const name = cardFileName(recap.data.meta.year, user.login).replace(
    /\.png$/,
    kind === "private" ? "-with-private.png" : ".png",
  );
  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
