import type { MetadataRoute } from "next";
import { siteUrl } from "@/site";

// Bump when a page's content changes. A fixed date, not new Date(): a build-time clock would tell
// crawlers every page changed on every deploy.
const UPDATED = new Date("2026-11-04");

/** Static public pages. Shared recaps are opt-in and come and go, so they are not listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, lastModified: UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.5 },
  ];
}
