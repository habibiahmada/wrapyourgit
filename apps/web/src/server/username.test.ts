import { describe, expect, test } from "bun:test";
import { isValidLogin } from "./username";

describe("isValidLogin", () => {
  test("GitHub logins pass, including a double hyphen and 39 characters", () => {
    for (const name of ["octo", "a", "a-b", "a--b", "a".repeat(39)]) {
      expect(isValidLogin(name)).toBe(true);
    }
  });

  test("names GitHub can't issue fail", () => {
    for (const name of ["-a", "a-", "a b", "", "a".repeat(40), "a_b"]) {
      expect(isValidLogin(name)).toBe(false);
    }
  });
});
