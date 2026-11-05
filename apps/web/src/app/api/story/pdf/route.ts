import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getCurrentUser } from "@/server/auth";
import { slideExportsAvailable } from "@/server/exports";
import { getRecap } from "@/server/recaps";
import { SLIDE_SIZE, SLIDE_TITLES, slidePng, slidesUnavailable } from "@/server/slides";

/** The whole story, letter included, as a PDF: one 4:5 page per slide. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  // Both need every chapter slide; don't start renders that can't finish here.
  if (!slideExportsAvailable()) return slidesUnavailable();
  const recap = await getRecap(user.id);
  if (!recap) return new NextResponse("Build your recap first", { status: 404 });

  const syncedAt = recap.syncedAt.toISOString();
  let slides: (Uint8Array<ArrayBuffer> | null)[];
  try {
    slides = await Promise.all(SLIDE_TITLES.map((_, i) => slidePng(user.id, syncedAt, i)));
  } catch (error) {
    return slidesUnavailable(error);
  }
  const pdf = await PDFDocument.create();
  pdf.setTitle(`WrapYourGit ${recap.data.meta.year}: @${user.login}`);
  pdf.setCreator("WrapYourGit");
  for (const png of slides) {
    if (!png) continue;
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([SLIDE_SIZE.width, SLIDE_SIZE.height]);
    page.drawImage(image, { x: 0, y: 0, width: SLIDE_SIZE.width, height: SLIDE_SIZE.height });
  }
  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="wrapyourgit-${recap.data.meta.year}-${user.login}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
