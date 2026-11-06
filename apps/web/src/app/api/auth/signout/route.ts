import { type NextRequest, NextResponse } from "next/server";
import { appUrl, endAllSessions, endSession } from "@/server/auth";
import { isSameOrigin } from "@/server/same-origin";

/** Signs out this browser, or every device when the form sends `scope=everywhere` (settings). */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const form = await request.formData().catch(() => null);
  if (form?.get("scope") === "everywhere") await endAllSessions();
  else await endSession();
  // 303 turns the form POST into a GET of the landing page.
  return NextResponse.redirect(new URL("/", appUrl()), 303);
}
