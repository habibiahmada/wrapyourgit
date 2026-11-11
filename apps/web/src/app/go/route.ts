import { NextResponse } from "next/server";
import { recapPath } from "@/server/routes";
import { normalizeUsername } from "@/server/username";

/**
 * Where the username field posts (ruling R4): a plain GET form, so it works without JavaScript.
 * "@octo" or a github.com link becomes /octo; a name GitHub couldn't issue goes back to the
 * landing page, which shows the error by its field. No lookup happens here: /<username> decides
 * whether the account exists.
 */
export function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("u") ?? "";
  const login = normalizeUsername(input);
  return NextResponse.redirect(new URL(login ? recapPath(login) : "/?u=invalid", request.url));
}
