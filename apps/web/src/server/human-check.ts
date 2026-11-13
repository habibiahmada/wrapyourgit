import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * The check that a person, not a script, is asking for a recap nobody has fetched yet
 * (ADR-0026). Pure rules and the one call to Cloudflare; reading the request is in human.ts.
 *
 * A visitor who passes Cloudflare Turnstile gets a pass: a cookie that says "until this time,
 * for this client", signed by the server. Nothing is stored for it.
 */

/** The pass. HttpOnly: the page never needs to read it. */
export const PASS_COOKIE = "wyg_human";
/** How long one check lasts. The client's lookup limit (public-policy.ts) still applies. */
export const PASS_MS = 60 * 60 * 1000;

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** Cloudflare's own limit on a token's length. */
const TOKEN_MAX = 2048;
const VERIFY_TIMEOUT_MS = 5_000;

export interface TurnstileConfig {
  siteKey: string;
  secretKey: string;
}

/**
 * The widget's keys, or null when either is missing: the check is then off and every request
 * counts as a person's, so a deploy without the keys behaves as it did before the check existed.
 */
export function turnstileConfig(
  env: Record<string, string | undefined> = process.env,
): TurnstileConfig | null {
  const siteKey = env.TURNSTILE_SITE_KEY;
  const secretKey = env.TURNSTILE_SECRET_KEY;
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

/** The key passes are signed with: the token encryption key under a label of its own. */
export function passKey(encryptionKey: string): string {
  return createHmac("sha256", encryptionKey).update("human-pass").digest("hex");
}

function seal(expiresAt: number, client: string, key: string): string {
  return createHmac("sha256", key).update(`${expiresAt}.${client}`).digest("hex");
}

/**
 * A pass for `client` (clientKey() of the request, a salted hash of its address) until
 * `expiresAt`. Bound to the client so a pass copied to another address is worth nothing.
 */
export function signPass(client: string, expiresAt: Date, key: string): string {
  const time = expiresAt.getTime();
  return `${time}.${seal(time, client, key)}`;
}

/** Whether `value` is a pass this server signed for this client that has not run out. */
export function passIsValid(
  value: string | undefined,
  client: string,
  now: Date,
  key: string,
): boolean {
  const [time, mac, ...rest] = (value ?? "").split(".");
  if (!time || !mac || rest.length > 0 || !/^\d{1,16}$/.test(time)) return false;
  const expiresAt = Number(time);
  // No later than a pass signed now could be: a forged far-future time fails before the MAC.
  if (expiresAt <= now.getTime() || expiresAt > now.getTime() + PASS_MS) return false;
  const expected = Buffer.from(seal(expiresAt, client, key));
  const given = Buffer.from(mac);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Asks Cloudflare whether `token` came from a visitor who passed the widget. False for anything
 * else, a network failure and a timeout included: a check that cannot be made is not passed.
 * `address` is the visitor's, or "unknown".
 */
export async function verifyTurnstile(
  token: string,
  address: string,
  secretKey: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || token.length > TOKEN_MAX) return false;
  try {
    const response = await fetcher(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        ...(address === "unknown" ? {} : { remoteip: address }),
      }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return typeof result === "object" && result !== null && "success" in result
      ? result.success === true
      : false;
  } catch {
    return false;
  }
}
