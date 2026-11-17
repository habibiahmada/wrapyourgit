/*
 * How the site's cookies are named and secured, as pure rules (auth.ts and human-check.ts apply
 * them to the request).
 */

/**
 * Whether cookies get `Secure`: on any https origin, and always in production, so a deploy whose
 * APP_URL was mistyped as http:// still never sends a session over plain http.
 */
export function secureOrigin(appUrl: string, nodeEnv: string | undefined): boolean {
  return nodeEnv === "production" || appUrl.startsWith("https://");
}

/**
 * The name a cookie is sent under. On a secure origin it carries `__Host-`, which browsers accept
 * only with `Secure`, `Path=/` and no `Domain`: a sibling subdomain can then never plant or
 * overwrite it. Plain-http development keeps the bare name, since browsers drop a `__Host-`
 * cookie that is not `Secure`.
 */
export function cookieName(base: string, secure: boolean): string {
  return secure ? `__Host-${base}` : base;
}
