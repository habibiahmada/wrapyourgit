import type { NextConfig } from "next";

/**
 * Sent with every response. HSTS is Vercel's; these are the app's own. No page is ever meant to
 * be drawn inside another site's frame, a response is never to be read as another type, and a
 * link out says where it came from only by origin: a recap's address has a username in it.
 * The page asks for no camera, microphone or location, so nothing loaded into it may either.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
  // Signed-in users' own GitHub avatars on the dashboard.
  images: {
    // AVIF first: about a fifth smaller than WebP for the story frames; browsers without it get WebP.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  partialPrefetching: true,
  // Workspace packages ship TypeScript source (no build step), so Next must compile them.
  transpilePackages: ["@wyg/schema", "@wyg/analytics", "@wyg/github", "@wyg/video"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
