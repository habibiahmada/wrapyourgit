import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { requireEnv } from "./env";
import { PASS_COOKIE, passIsValid, passKey, turnstileConfig } from "./human-check";
import { clientKey } from "./public-recaps";

/**
 * Whether a person is known to be behind this request, which is what lets it make the server ask
 * GitHub for a recap nobody has fetched yet (ADR-0026):
 *
 * - with no Turnstile keys set the check is off, and every request counts;
 * - someone signed in has already proved more than the check asks;
 * - anyone else needs a pass (human-check.ts) from the check at /api/verify.
 *
 * A link preview's crawler has neither a session nor a pass: it gets what is stored, or the
 * site's own card.
 */
export async function requestIsHuman(signedIn: boolean): Promise<boolean> {
  if (!turnstileConfig()) return true;
  if (signedIn) return true;
  const pass = (await cookies()).get(PASS_COOKIE)?.value;
  // Reading a cookie is not enough for Next to allow the clock: the pass is checked against now,
  // so this waits for the request itself (cacheComponents).
  await connection();
  return passIsValid(
    pass,
    clientKey(await headers()),
    new Date(),
    passKey(requireEnv("TOKEN_ENCRYPTION_KEY")),
  );
}
