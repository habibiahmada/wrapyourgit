import { describe, expect, test } from "bun:test";
import { GitHubApiError } from "@wyg/github";
import { errorSummary } from "./log";
import { OAuthError } from "./oauth";

describe("errorSummary", () => {
  test("keeps kind and status, drops a message that names a private repo", () => {
    const error = new GitHubApiError(
      "Could not resolve to a Repository with the name 'octo/secret-client'.",
      200,
    );
    expect(errorSummary(error)).toBe("GitHubApiError status=200");
    expect(errorSummary(error)).not.toContain("secret-client");
  });

  test("OAuth errors keep their code", () => {
    expect(errorSummary(new OAuthError("bad_verification_code", "expired"))).toBe(
      "OAuthError code=bad_verification_code",
    );
  });

  test("anything else is reduced to its name", () => {
    expect(errorSummary(new TypeError("octo/secret-client"))).toBe("TypeError");
    expect(errorSummary("octo/secret-client")).toBe("string");
  });
});
