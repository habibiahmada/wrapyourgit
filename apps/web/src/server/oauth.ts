/*
 * GitHub App user authorization (web flow), as pure functions. Network calls take `fetch` as a
 * parameter so tests can stub GitHub. ADR-0006: no permissions are requested; tokens expire in
 * 8 h and come with a refresh token.
 */

import { timingSafeEqual } from "node:crypto";

/** Constant-time state check that compares bytes, so multi-byte input is a mismatch, not a throw. */
export function statesMatch(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";

/** Refresh this long before expiry, so a sync that starts on a valid token doesn't end on a dead one. */
export const REFRESH_SKEW_MS = 5 * 60 * 1000;

export function authorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Show the account picker instead of silently reusing whichever account is signed in.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/** Tokens with absolute expiry times. Expiry is null when the app has token expiration off. */
export interface TokenSet {
  accessToken: string;
  accessExpiresAt: Date | null;
  refreshToken: string | null;
  refreshExpiresAt: Date | null;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
}

export class OAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export function toTokenSet(response: TokenResponse, now: Date): TokenSet {
  if (!response.access_token) {
    throw new OAuthError(
      response.error ?? "no_access_token",
      response.error_description ?? "GitHub did not return an access token",
    );
  }
  const after = (seconds?: number) => (seconds ? new Date(now.getTime() + seconds * 1000) : null);
  return {
    accessToken: response.access_token,
    accessExpiresAt: after(response.expires_in),
    refreshToken: response.refresh_token ?? null,
    refreshExpiresAt: after(response.refresh_token_expires_in),
  };
}

async function requestToken(
  params: Record<string, string>,
  fetchImpl: typeof fetch,
  now: Date,
): Promise<TokenSet> {
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!response.ok)
    throw new OAuthError("http_error", `GitHub token endpoint: HTTP ${response.status}`);
  return toTokenSet((await response.json()) as TokenResponse, now);
}

export function exchangeCode(
  params: {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  },
  { fetchImpl = fetch, now = new Date() } = {},
): Promise<TokenSet> {
  return requestToken(
    {
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    },
    fetchImpl,
    now,
  );
}

export function refreshTokens(
  params: { clientId: string; clientSecret: string; refreshToken: string },
  { fetchImpl = fetch, now = new Date() } = {},
): Promise<TokenSet> {
  return requestToken(
    {
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
    },
    fetchImpl,
    now,
  );
}

/**
 * Revokes the user's authorization of the app ("Disconnect"), which also invalidates every token
 * GitHub issued to us for them. A 404 means it was already revoked, which is fine; anything else
 * that isn't 2xx (422 included) is a failure, so the UI never claims a revocation that didn't happen.
 */
export async function revokeGrant(
  params: { clientId: string; clientSecret: string; accessToken: string },
  { fetchImpl = fetch } = {},
): Promise<void> {
  const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
  const response = await fetchImpl(`https://api.github.com/applications/${params.clientId}/grant`, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      "User-Agent": "wrapyourgit",
    },
    body: JSON.stringify({ access_token: params.accessToken }),
  });
  if (!response.ok && response.status !== 404) {
    throw new OAuthError("revoke_failed", `GitHub grant revocation: HTTP ${response.status}`);
  }
}

export type TokenState = "valid" | "refresh" | "reauthorize";

/** What to do with stored tokens at `now`: use them, refresh them, or send the user to sign in. */
export function tokenState(tokens: Omit<TokenSet, "accessToken">, now: Date): TokenState {
  if (!tokens.accessExpiresAt) return "valid";
  if (tokens.accessExpiresAt.getTime() - REFRESH_SKEW_MS > now.getTime()) return "valid";
  if (!tokens.refreshToken) return "reauthorize";
  if (tokens.refreshExpiresAt && tokens.refreshExpiresAt.getTime() <= now.getTime()) {
    return "reauthorize";
  }
  return "refresh";
}
