import type { MetadataRoute } from "next";
import { siteUrl } from "@/site";

// Bump when a page's content changes. A fixed date, not new Date(): a build-time clock would tell
// crawlers every page changed on every deploy.
const UPDATED = new Date("2026-11-13");

/**
 * Static public pages. Every GitHub account has a recap at /<username>, and those pages ask not to
 * be indexed, so none are listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, lastModified: UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.4 },
  ];
}
