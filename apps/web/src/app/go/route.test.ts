import { describe, expect, test } from "bun:test";
import { GET } from "./route";

const go = (query: string) => GET(new Request(`https://wyg.test/go${query}`));

describe("GET /go", () => {
  test("a typed name goes to its recap", () => {
    expect(go("?u=+%40Octo+").headers.get("location")).toBe("https://wyg.test/Octo");
    expect(go("?u=https%3A%2F%2Fgithub.com%2Focto").headers.get("location")).toBe(
      "https://wyg.test/octo",
    );
  });

  test("a reserved name goes to /u/<name>", () => {
    expect(go("?u=settings").headers.get("location")).toBe("https://wyg.test/u/settings");
  });

  test("anything else goes back to the landing field with an error", () => {
    for (const query of ["?u=-bad", "?u=", ""]) {
      expect(go(query).headers.get("location")).toBe("https://wyg.test/?u=invalid");
    }
  });
});
