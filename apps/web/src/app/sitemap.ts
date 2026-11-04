import type { MetadataRoute } from "next";

/** Static public pages. Shared recaps are opt-in and come and go, so they are not listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
