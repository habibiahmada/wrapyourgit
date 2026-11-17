import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appUrl, githubClientId, oauthCookie, secureCookies } from "@/server/auth";
import { pkceChallenge, randomToken } from "@/server/crypto";
import { authorizeUrl } from "@/server/oauth";

/** Starts the GitHub App web flow. State and PKCE verifier ride in a short-lived httpOnly cookie. */
export async function GET() {
  const state = randomToken();
  const verifier = randomToken();
  (await cookies()).set(oauthCookie(), `${state}.${verifier}`, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    // "/" because a __Host- cookie must have it; it is HttpOnly and lives 10 minutes.
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(
    authorizeUrl({
      clientId: githubClientId(),
      redirectUri: `${appUrl()}/api/auth/callback/github`,
      state,
      codeChallenge: pkceChallenge(verifier),
    }),
  );
}
