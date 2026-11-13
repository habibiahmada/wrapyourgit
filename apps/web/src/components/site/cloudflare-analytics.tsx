import Script from "next/script";

/**
 * Cloudflare Web Analytics site token for wrapyourgit.com. It is public by design: every visitor's
 * browser receives it, and Cloudflare only accepts beacons from the configured hostname.
 */
const TOKEN = "d1c5446ebb1e41f482fa4ef56d5f7a60";

/**
 * The beacon's data attribute, or null where it must not load. Only the production deployment
 * counts, so previews and local runs never mix test visits into the numbers.
 */
export function beaconConfig(env: { VERCEL_ENV?: string }): string | null {
  return env.VERCEL_ENV === "production" ? JSON.stringify({ token: TOKEN }) : null;
}

/**
 * Page views and Core Web Vitals, with no cookies or local storage (privacy page, "What we
 * collect"). The zone is DNS only, so Cloudflare cannot inject this itself; the snippet is
 * installed by hand. Its SPA mode also counts client-side navigations.
 */
export function CloudflareAnalytics() {
  const config = beaconConfig({ VERCEL_ENV: process.env.VERCEL_ENV });
  if (!config) return null;
  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={config}
      strategy="afterInteractive"
    />
  );
}
