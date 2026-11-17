/*
 * The site's Content-Security-Policy (next.config.ts sends it with every response).
 *
 * An allowlist, not nonces: Next 16 can only put a nonce on scripts of pages rendered per request,
 * and that is incompatible with cacheComponents and its prerendered shells. So inline scripts stay
 * allowed (Next's own hydration data is inline), and the policy instead closes where anything else
 * may come from or go to: scripts only from this site and the two Cloudflare services the pages
 * use (and the story's font host), no plugins, no <base> rewriting, forms posting only here, frames only for Turnstile.
 */

/** Cloudflare Turnstile, the human check (ADR-0026): its script and its frame. */
const TURNSTILE = "https://challenges.cloudflare.com";
/** Cloudflare Web Analytics: the beacon script, and where it reports. */
const BEACON_SCRIPT = "https://static.cloudflareinsights.com";
const BEACON_REPORT = "https://cloudflareinsights.com";
/** The story's typeface, loaded by @remotion/google-fonts in the player (packages/video/theme.ts). */
const FONTS = "https://fonts.gstatic.com";
/** Signed-in users' GitHub avatars (next.config.ts images.remotePatterns). */
const AVATARS = "https://avatars.githubusercontent.com";

export function contentSecurityPolicy({ dev }: { dev: boolean }): string {
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    // React uses eval in development only, to rebuild server error stacks in the browser.
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      TURNSTILE,
      BEACON_SCRIPT,
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:", AVATARS],
    ["font-src", "'self'", "data:", FONTS],
    // The story's music and effects are fetched and decoded; the exports are blob: files.
    ["media-src", "'self'", "blob:", "data:"],
    // The story's font is also fetched (not only declared), so its host is a connection too.
    ["connect-src", "'self'", BEACON_REPORT, FONTS],
    // The browser renderer (MP4, slides) runs a worker.
    ["worker-src", "'self'", "blob:"],
    ["frame-src", TURNSTILE],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  if (!dev) directives.push(["upgrade-insecure-requests"]);
  return directives.map((words) => words.join(" ")).join("; ");
}
