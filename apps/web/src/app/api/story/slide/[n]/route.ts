import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { getRecap } from "@/server/recaps";
import { SLIDE_TITLES, slideFileName, slidePng } from "@/server/slides";

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
  const recap = await getRecap(user.id);
  const png = recap && (await slidePng(user.id, recap.syncedAt.toISOString(), index));
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
