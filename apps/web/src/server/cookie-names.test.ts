import { describe, expect, test } from "bun:test";
import { cookieName, secureOrigin } from "./cookie-names";

describe("secureOrigin", () => {
  test("https is secure, and production is secure whatever APP_URL says", () => {
    expect(secureOrigin("https://wrapyourgit.com", "production")).toBe(true);
    expect(secureOrigin("http://wrapyourgit.com", "production")).toBe(true);
    expect(secureOrigin("https://app.test", "development")).toBe(true);
  });

  test("plain http stays usable for local development and tests", () => {
    expect(secureOrigin("http://localhost:3000", "development")).toBe(false);
    expect(secureOrigin("http://localhost:3000", "test")).toBe(false);
    expect(secureOrigin("http://localhost:3000", undefined)).toBe(false);
  });
});

describe("cookieName", () => {
  test("a secure origin locks the cookie to this host with __Host-", () => {
    expect(cookieName("wyg_session", true)).toBe("__Host-wyg_session");
  });

  test("plain http keeps the bare name: browsers drop __Host- cookies without Secure", () => {
    expect(cookieName("wyg_session", false)).toBe("wyg_session");
  });
});
