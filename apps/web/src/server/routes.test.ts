import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { isReserved, RESERVED, recapPath, viewerKind } from "./routes";

describe("isReserved", () => {
  test("a site route is reserved whatever its case; a username is not", () => {
    expect(isReserved("Settings")).toBe(true);
    expect(isReserved("habibiahmada")).toBe(false);
  });

  test("every top-level route folder in app/ is reserved", () => {
    const app = join(import.meta.dir, "..", "app");
    const folders = readdirSync(app, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "[username]")
      .map((entry) => entry.name.toLowerCase());
    expect(folders.length).toBeGreaterThan(0);
    for (const folder of folders) expect(RESERVED.has(folder)).toBe(true);
  });
});

describe("viewerKind", () => {
  test("the signed-in user on their own page is the owner, ignoring case", () => {
    expect(viewerKind("HabibiAhmada", "habibiahmada")).toBe("owner");
  });

  test("signed out, or signed in as someone else, is a visitor", () => {
    expect(viewerKind(null, "x")).toBe("visitor");
    expect(viewerKind("a", "b")).toBe("visitor");
  });
});

describe("recapPath", () => {
  test("a username lives at the root; a reserved name falls back to /u/", () => {
    expect(recapPath("habibiahmada")).toBe("/habibiahmada");
    expect(recapPath("settings")).toBe("/u/settings");
  });

  test("a name from the URL stays one path segment, never another host", () => {
    expect(recapPath("/evil.example")).toBe("/%2Fevil.example");
  });
});
