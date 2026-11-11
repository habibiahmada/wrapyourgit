import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { recapPath } from "@/server/routes";

/**
 * The story's old address: your own recap now lives at /<login>, and signed out there is nothing
 * of yours to show. A route handler, so this is a real redirect rather than one streamed into a
 * page shell.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  return NextResponse.redirect(new URL(user ? recapPath(user.login) : "/", request.url));
}
