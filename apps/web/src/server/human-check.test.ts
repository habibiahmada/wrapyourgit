import { describe, expect, test } from "bun:test";
import {
  PASS_MS,
  passIsValid,
  passKey,
  signPass,
  turnstileConfig,
  verifyTurnstile,
} from "./human-check";

const key = passKey("0123456789abcdef0123456789abcdef");
const now = new Date("2026-11-13T10:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);

describe("turnstileConfig", () => {
  test("needs both keys; with either missing the check is off", () => {
    expect(turnstileConfig({ TURNSTILE_SITE_KEY: "s", TURNSTILE_SECRET_KEY: "k" })).toEqual({
      siteKey: "s",
      secretKey: "k",
    });
    expect(turnstileConfig({ TURNSTILE_SITE_KEY: "s" })).toBeNull();
    expect(turnstileConfig({ TURNSTILE_SECRET_KEY: "k" })).toBeNull();
    expect(turnstileConfig({ TURNSTILE_SITE_KEY: "", TURNSTILE_SECRET_KEY: "k" })).toBeNull();
    expect(turnstileConfig({})).toBeNull();
  });
});

describe("the pass", () => {
  const pass = signPass("client-a", later(PASS_MS), key);

  test("holds for the client it was signed for, until it runs out", () => {
    expect(passIsValid(pass, "client-a", now, key)).toBe(true);
    expect(passIsValid(pass, "client-a", later(PASS_MS - 1), key)).toBe(true);
    expect(passIsValid(pass, "client-a", later(PASS_MS), key)).toBe(false);
    expect(passIsValid(pass, "client-a", later(PASS_MS + 60_000), key)).toBe(false);
  });

  test("is worth nothing to another client, or under another key", () => {
    expect(passIsValid(pass, "client-b", now, key)).toBe(false);
    expect(passIsValid(pass, "client-a", now, passKey("another key entirely, 32 chars!"))).toBe(
      false,
    );
  });

  test("a changed time or a changed seal fails", () => {
    const [time = "", mac = ""] = pass.split(".");
    expect(passIsValid(`${Number(time) + 1}.${mac}`, "client-a", now, key)).toBe(false);
    const flipped = mac.endsWith("0") ? "1" : "0";
    expect(passIsValid(`${time}.${mac.slice(0, -1)}${flipped}`, "client-a", now, key)).toBe(false);
    expect(passIsValid(`${time}.${mac.slice(0, -2)}`, "client-a", now, key)).toBe(false);
  });

  test("a time further off than any pass signed now could have fails, even well sealed", () => {
    const far = signPass("client-a", later(PASS_MS + 1), key);
    expect(passIsValid(far, "client-a", now, key)).toBe(false);
  });

  test("anything that is not a pass fails", () => {
    for (const value of [undefined, "", "abc", "1.2.3", ".", "123.", ".abc", "1e3.abc", "-5.abc"]) {
      expect(passIsValid(value, "client-a", now, key)).toBe(false);
    }
  });

  test("the signing key is not the encryption key", () => {
    expect(key).not.toContain("0123456789abcdef");
    expect(key).toHaveLength(64);
  });
});

describe("verifyTurnstile", () => {
  const answering = (
    body: unknown,
    status = 200,
    seen?: (init: RequestInit | undefined) => void,
  ): typeof fetch =>
    (async (_url: unknown, init?: RequestInit) => {
      seen?.(init);
      return new Response(JSON.stringify(body), { status });
    }) as typeof fetch;

  test("true only when Cloudflare says success", async () => {
    expect(await verifyTurnstile("t", "203.0.113.7", "k", answering({ success: true }))).toBe(true);
    expect(await verifyTurnstile("t", "203.0.113.7", "k", answering({ success: false }))).toBe(
      false,
    );
    expect(await verifyTurnstile("t", "203.0.113.7", "k", answering({ success: "true" }))).toBe(
      false,
    );
    expect(await verifyTurnstile("t", "203.0.113.7", "k", answering({}))).toBe(false);
    expect(await verifyTurnstile("t", "203.0.113.7", "k", answering(null))).toBe(false);
    expect(await verifyTurnstile("t", "203.0.113.7", "k", answering({ success: true }, 500))).toBe(
      false,
    );
  });

  test("sends the secret, the token and the address, and leaves an unknown address out", async () => {
    let sent: Record<string, unknown> = {};
    const record = (init: RequestInit | undefined) => {
      sent = JSON.parse(String(init?.body));
    };
    await verifyTurnstile("tok", "203.0.113.7", "sec", answering({ success: true }, 200, record));
    expect(sent).toEqual({ secret: "sec", response: "tok", remoteip: "203.0.113.7" });
    await verifyTurnstile("tok", "unknown", "sec", answering({ success: true }, 200, record));
    expect(sent).toEqual({ secret: "sec", response: "tok" });
  });

  test("an empty or oversized token is refused without asking", async () => {
    let asked = 0;
    const counting = answering({ success: true }, 200, () => {
      asked++;
    });
    expect(await verifyTurnstile("", "unknown", "k", counting)).toBe(false);
    expect(await verifyTurnstile("x".repeat(2049), "unknown", "k", counting)).toBe(false);
    expect(asked).toBe(0);
  });

  test("a failure to reach Cloudflare is not a pass", async () => {
    const failing = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile("t", "unknown", "k", failing)).toBe(false);
    const garbage = (async () =>
      new Response("not json", { status: 200 })) as unknown as typeof fetch;
    expect(await verifyTurnstile("t", "unknown", "k", garbage)).toBe(false);
  });
});
