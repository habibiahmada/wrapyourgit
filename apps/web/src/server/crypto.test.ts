import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt, hashToken, parseKey, pkceChallenge, randomToken } from "./crypto";

const key = randomBytes(32);

describe("encrypt / decrypt", () => {
  test("round-trips and never stores the plaintext", () => {
    const sealed = encrypt("ghu_secret", key);
    expect(sealed).not.toContain("ghu_secret");
    expect(decrypt(sealed, key)).toBe("ghu_secret");
  });

  test("same plaintext encrypts differently each time (random IV)", () => {
    expect(encrypt("x", key)).not.toBe(encrypt("x", key));
  });

  test("a tampered ciphertext fails instead of returning garbage", () => {
    const [version, iv, tag, ciphertext = ""] = encrypt("ghu_secret", key).split(".");
    const flipped = Buffer.from(ciphertext, "base64url");
    flipped[0] = (flipped[0] ?? 0) ^ 1;
    expect(() =>
      decrypt([version, iv, tag, flipped.toString("base64url")].join("."), key),
    ).toThrow();
  });

  test("the wrong key fails", () => {
    expect(() => decrypt(encrypt("ghu_secret", key), randomBytes(32))).toThrow();
  });
});

describe("parseKey", () => {
  test("accepts 32 bytes and rejects anything else", () => {
    expect(parseKey(key.toString("base64")).length).toBe(32);
    expect(() => parseKey(randomBytes(16).toString("base64"))).toThrow();
  });
});

describe("tokens", () => {
  test("random tokens are 256-bit and unique", () => {
    const token = randomToken();
    expect(Buffer.from(token, "base64url").length).toBe(32);
    expect(randomToken()).not.toBe(token);
  });

  test("hashToken is a stable SHA-256 hex digest", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("PKCE challenge matches the RFC 7636 example", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});
