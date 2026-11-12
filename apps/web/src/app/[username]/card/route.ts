import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { publicCardPng } from "@/server/card";
import { parseCardShape } from "@/server/card-shape";
import { clientKey, loadPublicRecap } from "@/server/public-recaps";
import { isValidLogin } from "@/server/username";

/** Same as the page: a card asked for first may wait for, or run, the fetch. */
export const maxDuration = 120;

/**
 * A visitor's download of someone's card, in the link preview size or a video shape
 * (`?format=9x16`). Built from the public recap only (`loadPublicRecap`, like the page and its
 * link preview), looked up on every request so a hidden recap stops serving at once; only the PNG
 * is cached. Unlike the link preview, an address with no recap gets a 404, not the site's card:
 * this is a file someone asked to keep.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const shape = parseCardShape(request.nextUrl.searchParams.get("format"));
  if (!shape) return new NextResponse("Unknown card size", { status: 400 });
  const { username } = await params;
  const result = isValidLogin(username)
    ? await loadPublicRecap(username, clientKey(await headers()))
    : null;
  if (result?.kind !== "recap") return new NextResponse("No card here", { status: 404 });
  const png = await publicCardPng(result.data, shape);
  const suffix = shape === "card" ? "" : `-${shape}`;
  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="wrapyourgit-${result.data.meta.year}-${result.data.profile.login}${suffix}.png"`,
    },
  });
}
