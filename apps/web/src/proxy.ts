import { type NextRequest, NextResponse } from "next/server";
import { isReserved, recapPath } from "@/server/routes";

/**
 * /u/<login> was the address of shared recaps; recaps now live at /<login>. A page can't answer
 * with a real 308 (its static shell is already on the wire), so the redirect happens here. Names
 * a site route uses stay: /u/settings is where the account "settings" keeps its recap.
 */
export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[2] ?? "";
  let login: string;
  try {
    login = decodeURIComponent(segment);
  } catch {
    return NextResponse.next();
  }
  if (login === "" || isReserved(login)) return NextResponse.next();
  return NextResponse.redirect(new URL(recapPath(login), request.url), 308);
}

export const config = { matcher: "/u/:login" };
