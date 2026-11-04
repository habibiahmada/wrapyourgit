import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { appUrl, githubApp, OAUTH_COOKIE, signInWithTokens, startSession } from "@/server/auth";
import { exchangeCode } from "@/server/oauth";

const back = (error: string) => NextResponse.redirect(new URL(`/?signin=${error}`, appUrl()));

/** GitHub redirects here after the user approves (or cancels). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const [expectedState = "", verifier = ""] = (store.get(OAUTH_COOKIE)?.value ?? "").split(".");
  store.delete({ name: OAUTH_COOKIE, path: "/api/auth" });

  if (params.get("error") === "access_denied") return back("cancelled");
  const state = params.get("state") ?? "";
  const code = params.get("code");
  if (
    !code ||
    !expectedState ||
    state.length !== expectedState.length ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
  ) {
    return back("expired");
  }

  try {
    const tokens = await exchangeCode({
      ...githubApp(),
      code,
      redirectUri: `${appUrl()}/api/auth/callback/github`,
      codeVerifier: verifier,
    });
    const userId = await signInWithTokens(tokens);
    await startSession(userId);
  } catch (error) {
    console.error("GitHub sign-in failed", error instanceof Error ? error.message : error);
    return back("failed");
  }
  return NextResponse.redirect(new URL("/dashboard", appUrl()));
}
