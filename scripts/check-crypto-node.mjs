/**
 * Runs the token crypto (apps/web/src/server/crypto.ts) under real Node, the runtime production
 * uses. `bun test` covers it under Bun; this proves Node's AES-GCM also refuses anything forged.
 * CI runs it on Node 24, which strips TypeScript types itself:
 *
 *   node scripts/check-crypto-node.mjs
 *
 * Plain .mjs on purpose: it imports the .ts module directly, which the TypeScript config forbids.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "../apps/web/src/server/crypto.ts";

assert.ok(!process.versions.bun, "Run this with Node, not Bun.");

const key = randomBytes(32);
const sealed = encrypt("ghu_secret", key);
const [version, iv, tag = "", ciphertext = ""] = sealed.split(".");
const flip = (part) => {
  const bytes = Buffer.from(part, "base64url");
  bytes[0] ^= 1;
  return bytes.toString("base64url");
};

const cases = {
  "a tampered full-length tag": [version, iv, flip(tag), ciphertext].join("."),
  "a tampered ciphertext": [version, iv, tag, flip(ciphertext)].join("."),
  "a 4-byte tag": [
    version,
    iv,
    Buffer.from(tag, "base64url").subarray(0, 4).toString("base64url"),
    ciphertext,
  ].join("."),
};

assert.equal(decrypt(sealed, key), "ghu_secret", "round trip");
for (const [name, payload] of Object.entries(cases)) {
  assert.throws(() => decrypt(payload, key), `${name} must not decrypt`);
}
assert.throws(() => decrypt(sealed, randomBytes(32)), "the wrong key must not decrypt");

console.log(`✓ Token crypto refuses forged values on Node ${process.versions.node}.`);
