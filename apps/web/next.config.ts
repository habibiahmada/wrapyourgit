import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Signed-in users' own GitHub avatars on the dashboard.
  images: { remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }] },
  partialPrefetching: true,
  // Workspace packages ship TypeScript source (no build step), so Next must compile them.
  transpilePackages: [
    "@wyg/schema",
    "@wyg/analytics",
    "@wyg/github",
    "@wyg/video",
    "@wyg/renderer",
  ],
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
