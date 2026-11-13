import { type NextRequest, NextResponse } from "next/server";
import { secureCookies } from "@/server/auth";
import { requireEnv } from "@/server/env";
import {
  PASS_COOKIE,
  PASS_MS,
  passKey,
  signPass,
  turnstileConfig,
  verifyTurnstile,
} from "@/server/human-check";
import { firstForwardedAddress } from "@/server/public-policy";
import { clientKey } from "@/server/public-recaps";
import { isSameOrigin } from "@/server/same-origin";

/**
 * Trades a Turnstile token for a pass (ADR-0026). The token is checked with Cloudflare on the
 * server, never trusted from the page; the pass is a signed cookie for this client for an hour,
 * and nothing is stored. With no keys set there is nothing to prove, and nothing is set.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const config = turnstileConfig();
  if (!config) return new NextResponse(null, { status: 204 });

  const body: unknown = await request.json().catch(() => null);
  const token =
    typeof body === "object" && body !== null && "token" in body && typeof body.token === "string"
      ? body.token
      : "";
  const address = firstForwardedAddress(request.headers.get("x-forwarded-for"));
  if (!(await verifyTurnstile(token, address, config.secretKey))) {
    return new NextResponse("Verification failed", { status: 403 });
  }

  const expires = new Date(Date.now() + PASS_MS);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(
    PASS_COOKIE,
    signPass(clientKey(request.headers), expires, passKey(requireEnv("TOKEN_ENCRYPTION_KEY"))),
    { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", expires },
  );
  return response;
}
