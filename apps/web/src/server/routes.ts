/*
 * Every GitHub username has a recap at /<username>, but site routes win: a request for /settings
 * is the settings page even if a GitHub account is called "settings". Such an account's recap
 * lives at /u/<name> instead. Compared lower-cased, since /Settings would otherwise reach the
 * username route.
 */

/**
 * Every top-level folder under app/ (ruling R4 added `go`, the landing form's handler) and the
 * file routes served without an extension. Routes served with a dot (/robots.txt, /favicon.ico)
 * need no entry: a GitHub login has no dots. routes.test.ts checks this list against app/ both ways.
 */
export const RESERVED: ReadonlySet<string> = new Set([
  "api",
  "dashboard",
  "go",
  "opengraph-image",
  "privacy",
  "recap",
  "settings",
  "terms",
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
