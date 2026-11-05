import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { LETTER_INDEX, slideExportsAvailable } from "@/server/exports";
import { getRecap } from "@/server/recaps";
import { SLIDE_TITLES, slideFileName, slidePng, slidesUnavailable } from "@/server/slides";

/**
 * One story slide as PNG. `?download` sends it as an attachment; without it the image is shown
 * inline (thumbnails on the export step). Only the owner can fetch their slides.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/story/slide/[n]">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  const index = Number((await params).n) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= SLIDE_TITLES.length) {
    return new NextResponse("No such slide", { status: 404 });
  }
  // The letter is next/og and renders anywhere; chapter slides need the slide renderer.
  if (index !== LETTER_INDEX && !slideExportsAvailable()) return slidesUnavailable();
  const recap = await getRecap(user.id);
  let png: Uint8Array<ArrayBuffer> | null = null;
  try {
    png = recap && (await slidePng(user.id, recap.syncedAt.toISOString(), index));
  } catch (error) {
    return slidesUnavailable(error);
  }
  if (!recap || !png) return new NextResponse("Build your recap first", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-store",
  };
  if (new URL(request.url).searchParams.has("download")) {
    headers["Content-Disposition"] =
      `attachment; filename="${slideFileName(recap.data.meta.year, user.login, index)}"`;
  }
  return new NextResponse(png, { headers });
}
