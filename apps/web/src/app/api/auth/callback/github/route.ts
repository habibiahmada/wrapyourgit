import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { appUrl, githubApp, OAUTH_COOKIE, signInWithTokens, startSession } from "@/server/auth";
import { errorSummary } from "@/server/log";
import { exchangeCode, statesMatch } from "@/server/oauth";

const back = (error: string) => NextResponse.redirect(new URL(`/?signin=${error}`, appUrl()));

/** GitHub redirects here after the user approves (or cancels). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const [expectedState = "", verifier = ""] = (store.get(OAUTH_COOKIE)?.value ?? "").split(".");
  store.delete({ name: OAUTH_COOKIE, path: "/api/auth" });

  if (params.get("error") === "access_denied") return back("cancelled");
  const code = params.get("code");
  if (!code || !statesMatch(params.get("state") ?? "", expectedState)) {
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
    console.error("GitHub sign-in failed", errorSummary(error));
    return back("failed");
  }
  return NextResponse.redirect(new URL("/dashboard", appUrl()));
}
