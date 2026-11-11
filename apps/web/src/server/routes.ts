/*
 * Every GitHub username has a recap at /<username>, but site routes win: a request for /settings
 * is the settings page even if a GitHub account is called "settings". Such an account's recap
 * lives at /u/<name> instead. Compared lower-cased, since /Settings would otherwise reach the
 * username route.
 */

/**
 * The top-level names under app/ (routes.test.ts checks every folder is here), the file routes at
 * the root that a username could look like, and `go`, the landing form's handler (ruling R4).
 */
export const RESERVED: ReadonlySet<string> = new Set([
  "api",
  "apple-icon",
  "dashboard",
  "favicon",
  "go",
  "icon",
  "manifest",
  "opengraph-image",
  "privacy",
  "recap",
  "robots",
  "settings",
  "sitemap",
  "u",
]);

export function isReserved(name: string): boolean {
  return RESERVED.has(name.toLowerCase());
}

/** Whether the signed-in user is looking at their own page. GitHub logins ignore case. */
export function viewerKind(signedInLogin: string | null, pageLogin: string): "owner" | "visitor" {
  return signedInLogin !== null && signedInLogin.toLowerCase() === pageLogin.toLowerCase()
    ? "owner"
    : "visitor";
}

/**
 * Where a login's recap lives. Encoded: a name can come straight from the URL (a retry link for a
 * name GitHub doesn't know), and "/evil.example" must not become the protocol-relative
 * "//evil.example".
 */
export function recapPath(login: string): string {
  const segment = encodeURIComponent(login);
  return isReserved(login) ? `/u/${segment}` : `/${segment}`;
}
