import { type NextRequest, NextResponse } from "next/server";
import { appUrl, endSession } from "@/server/auth";
import { isSameOrigin } from "@/server/same-origin";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  await endSession();
  // 303 turns the form POST into a GET of the landing page.
  return NextResponse.redirect(new URL("/", appUrl()), 303);
}
