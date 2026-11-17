import { describe, expect, test } from "bun:test";
import { contentSecurityPolicy } from "./csp";

const directives = (policy: string) =>
  new Map(
    policy
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .filter((words) => words[0])
      .map(([name, ...values]) => [name, values] as const),
  );

describe("contentSecurityPolicy", () => {
  const prod = directives(contentSecurityPolicy({ dev: false }));
  const dev = directives(contentSecurityPolicy({ dev: true }));

  test("scripts only from this site, Turnstile and the Cloudflare beacon", () => {
    expect(prod.get("script-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://challenges.cloudflare.com",
      "https://static.cloudflareinsights.com",
    ]);
    expect(prod.get("default-src")).toEqual(["'self'"]);
  });

  test("no eval in production; development keeps it for React's tooling", () => {
    expect(prod.get("script-src")).not.toContain("'unsafe-eval'");
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
  });

  test("closes the doors a page never uses", () => {
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("base-uri")).toEqual(["'self'"]);
    expect(prod.get("form-action")).toEqual(["'self'"]);
    expect(prod.get("frame-ancestors")).toEqual(["'none'"]);
    expect(prod.get("frame-src")).toEqual(["https://challenges.cloudflare.com"]);
  });

  test("connections, workers and media stay on this site, the beacon and the font host", () => {
    expect(prod.get("connect-src")).toEqual([
      "'self'",
      "https://cloudflareinsights.com",
      "https://fonts.gstatic.com",
    ]);
    expect(prod.get("worker-src")).toEqual(["'self'", "blob:"]);
    expect(prod.get("media-src")).toEqual(["'self'", "blob:", "data:"]);
    expect(prod.get("font-src")).toEqual(["'self'", "data:", "https://fonts.gstatic.com"]);
  });

  test("production upgrades stray http requests; local http development does not", () => {
    expect(prod.has("upgrade-insecure-requests")).toBe(true);
    expect(dev.has("upgrade-insecure-requests")).toBe(false);
  });

  test("is one header line", () => {
    expect(contentSecurityPolicy({ dev: false })).not.toMatch(/[\r\n]/);
  });
});
