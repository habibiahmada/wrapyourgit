import { describe, expect, test } from "bun:test";
import {
  authorizeUrl,
  exchangeCode,
  OAuthError,
  REFRESH_SKEW_MS,
  tokenState,
  toTokenSet,
} from "./oauth";

const now = new Date("2026-11-04T10:00:00Z");
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);

describe("authorizeUrl", () => {
  test("carries state and an S256 PKCE challenge, and no scopes", () => {
    const url = new URL(
      authorizeUrl({
        clientId: "Iv23abc",
        redirectUri: "http://localhost:3000/api/auth/callback/github",
        state: "s1",
        codeChallenge: "c1",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("state")).toBe("s1");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.has("scope")).toBe(false);
  });
});

describe("toTokenSet", () => {
  test("turns relative lifetimes into absolute expiry times", () => {
    const tokens = toTokenSet(
      {
        access_token: "ghu_a",
        expires_in: 28_800,
        refresh_token: "ghr_r",
        refresh_token_expires_in: 15_897_600,
      },
      now,
    );
    expect(tokens.accessExpiresAt).toEqual(hours(8));
    expect(tokens.refreshToken).toBe("ghr_r");
  });

  test("GitHub's error payload (HTTP 200) becomes an OAuthError", () => {
    expect(() =>
      toTokenSet({ error: "bad_verification_code", error_description: "expired" }, now),
    ).toThrow(OAuthError);
  });
});

describe("exchangeCode", () => {
  test("posts the code and PKCE verifier as a form", async () => {
    let body = "";
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      body = String(init?.body);
      return Response.json({ access_token: "ghu_a" });
    }) as unknown as typeof fetch;
    await exchangeCode(
      { clientId: "id", clientSecret: "secret", code: "c", redirectUri: "r", codeVerifier: "v" },
      { fetchImpl, now },
    );
    expect(new URLSearchParams(body).get("code_verifier")).toBe("v");
  });
});

describe("tokenState", () => {
  const refresh = { refreshToken: "ghr_r", refreshExpiresAt: hours(24 * 180) };

  test("valid well before expiry, refresh inside the skew window", () => {
    expect(tokenState({ accessExpiresAt: hours(1), ...refresh }, now)).toBe("valid");
    const soon = new Date(now.getTime() + REFRESH_SKEW_MS - 1000);
    expect(tokenState({ accessExpiresAt: soon, ...refresh }, now)).toBe("refresh");
  });

  test("reauthorize when the refresh token is gone or expired", () => {
    expect(
      tokenState({ accessExpiresAt: hours(-1), refreshToken: null, refreshExpiresAt: null }, now),
    ).toBe("reauthorize");
    expect(
      tokenState(
        { accessExpiresAt: hours(-1), refreshToken: "r", refreshExpiresAt: hours(-1) },
        now,
      ),
    ).toBe("reauthorize");
  });

  test("non-expiring tokens are always valid", () => {
    expect(
      tokenState({ accessExpiresAt: null, refreshToken: null, refreshExpiresAt: null }, now),
    ).toBe("valid");
  });
});
