import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { isReserved, RESERVED, recapPath, viewerKind } from "./routes";
import { isValidLogin } from "./username";

describe("isReserved", () => {
  test("a site route is reserved whatever its case; a username is not", () => {
    expect(isReserved("Settings")).toBe(true);
    expect(isReserved("habibiahmada")).toBe(false);
  });

  test("every top-level route in app/ that a login could name is reserved, and nothing else", () => {
    const served = topLevelRoutes();
    expect(served.length).toBeGreaterThan(0);
    // A route served with a dot (robots.txt) can't be a login, so it needs no entry.
    const needed = served.filter(isValidLogin).map((name) => name.toLowerCase());
    expect([...RESERVED].sort()).toEqual([...new Set(needed)].sort());
  });
});

/** Files in app/ that are conventions for the tree, not routes of their own. */
const NOT_ROUTES = new Set([
  "default",
  "error",
  "global-error",
  "globals",
  "layout",
  "loading",
  "not-found",
  "page",
  "template",
]);

/** Metadata files written as code but served with an extension (Next's file conventions). */
const SERVED_AS: Record<string, string> = {
  manifest: "manifest.webmanifest",
  robots: "robots.txt",
  sitemap: "sitemap.xml",
};

/**
 * The first path segment of everything app/ serves at the root: folders as they are, code files
 * by their convention (opengraph-image.tsx is /opengraph-image), static files by their full name.
 */
function topLevelRoutes(): string[] {
  const app = join(import.meta.dir, "..", "app");
  return readdirSync(app, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return entry.name === "[username]" ? [] : [entry.name];
    const match = /^(.+)\.(tsx?|jsx?)$/.exec(entry.name);
    if (!match) return [entry.name];
    const base = match[1] ?? "";
    if (NOT_ROUTES.has(base) || base.endsWith(".test")) return [];
    return [SERVED_AS[base] ?? base];
  });
}

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
