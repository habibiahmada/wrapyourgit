import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/*
 * Pure crypto helpers: the key is passed in, so these run under `bun test` without server env.
 * Tokens at rest use AES-256-GCM (ADR-0006): authenticated, so a tampered value fails to decrypt
 * instead of yielding garbage.
 */

const VERSION = "v1";

/** Decodes TOKEN_ENCRYPTION_KEY (`openssl rand -base64 32`) and checks it is 32 bytes. */
export function parseKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

/** `v1.<iv>.<tag>.<ciphertext>`, base64url parts. The version allows key rotation later. */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function decrypt(payload: string, key: Buffer): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
    throw new Error("Unrecognised encrypted value");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** 256-bit random value, base64url. Used for session cookies, OAuth state and PKCE verifiers. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Sessions are looked up by this hash; the raw token only ever lives in the user's cookie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** PKCE S256 challenge for a verifier (RFC 7636). */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
