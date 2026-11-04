import { describe, expect, test } from "bun:test";
import { GitHubApiError } from "@wyg/github";
import { isNetworkError, networkErrorCode } from "./network";

/** The shape Node's fetch (undici) throws when the connection itself fails. */
function undiciFailure(code: string): TypeError {
  const cause = Object.assign(new Error(`connect ${code} 185.199.108.133:443`), { code });
  return new TypeError("fetch failed", { cause });
}

describe("isNetworkError", () => {
  test("Node fetch transport failures", () => {
    expect(isNetworkError(undiciFailure("ETIMEDOUT"))).toBe(true);
    expect(isNetworkError(undiciFailure("EACCES"))).toBe(true);
    expect(isNetworkError(new TypeError("fetch failed"))).toBe(true);
  });

  test("errors that carry a socket code directly", () => {
    expect(isNetworkError(Object.assign(new Error("reset"), { code: "ECONNRESET" }))).toBe(true);
  });

  test("timeouts and aborts", () => {
    expect(isNetworkError(new DOMException("timed out", "TimeoutError"))).toBe(true);
  });

  test("a TypeError from a bug is not a network error", () => {
    expect(isNetworkError(new TypeError("Cannot read properties of undefined"))).toBe(false);
  });

  test("GitHub answering with an error is not a network error", () => {
    expect(isNetworkError(new GitHubApiError("Bad credentials", 401))).toBe(false);
    expect(isNetworkError("fetch failed")).toBe(false);
  });
});

describe("networkErrorCode", () => {
  test("prefers the socket code from the cause", () => {
    expect(networkErrorCode(undiciFailure("ETIMEDOUT"))).toBe("ETIMEDOUT");
  });

  test("falls back to the error name", () => {
    expect(networkErrorCode(new DOMException("timed out", "TimeoutError"))).toBe("TimeoutError");
  });
});
