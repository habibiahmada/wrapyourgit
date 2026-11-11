import { describe, expect, test } from "bun:test";
import { isValidLogin, normalizeUsername } from "./username";

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

describe("normalizeUsername", () => {
  test("trims, strips a leading @ and a github.com prefix", () => {
    expect(normalizeUsername(" @Octo ")).toBe("Octo");
    expect(normalizeUsername("https://github.com/octo")).toBe("octo");
    expect(normalizeUsername("github.com/octo/")).toBe("octo");
    expect(normalizeUsername("http://www.github.com/octo")).toBe("octo");
  });

  test("anything GitHub could not issue gives null", () => {
    for (const input of ["-bad", "a--", "", "a b", "a".repeat(40), "@", "github.com/"]) {
      expect(normalizeUsername(input)).toBeNull();
    }
  });
});
