import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { appUrl, githubApp, OAUTH_COOKIE, signInWithTokens, startSession } from "@/server/auth";
import { errorSummary } from "@/server/log";
import { exchangeCode, statesMatch } from "@/server/oauth";
import { recapPath } from "@/server/routes";

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

  let login: string;
  try {
    const tokens = await exchangeCode({
      ...githubApp(),
      code,
      redirectUri: `${appUrl()}/api/auth/callback/github`,
      codeVerifier: verifier,
    });
    const user = await signInWithTokens(tokens);
    await startSession(user.id);
    login = user.login;
  } catch (error) {
    console.error("GitHub sign-in failed", errorSummary(error));
    return back("failed");
  }
  // Straight to your own story: the page syncs a missing or stale recap behind its loading screen.
  return NextResponse.redirect(new URL(recapPath(login), appUrl()));
}
