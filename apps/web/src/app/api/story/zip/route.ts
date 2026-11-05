import { zipSync } from "fflate";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { slideExportsAvailable } from "@/server/exports";
import { getRecap } from "@/server/recaps";
import { SLIDE_TITLES, slideFileName, slidePng, slidesUnavailable } from "@/server/slides";

/** Every story slide as PNG in one ZIP. PNGs are already compressed, so entries are stored. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  // Both need every chapter slide; don't start renders that can't finish here.
  if (!slideExportsAvailable()) return slidesUnavailable();
  const recap = await getRecap(user.id);
  if (!recap) return new NextResponse("Build your recap first", { status: 404 });

  const syncedAt = recap.syncedAt.toISOString();
  const files: Record<string, Uint8Array> = {};
  try {
    await Promise.all(
      SLIDE_TITLES.map(async (_, i) => {
        const png = await slidePng(user.id, syncedAt, i);
        if (png) files[slideFileName(recap.data.meta.year, user.login, i)] = png;
      }),
    );
  } catch (error) {
    return slidesUnavailable(error);
  }
  const zip = zipSync(files, { level: 0 });
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="wrapyourgit-${recap.data.meta.year}-${user.login}-slides.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
