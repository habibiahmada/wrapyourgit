import type { MetadataRoute } from "next";
import { siteUrl } from "@/site";

/** Signed-in pages and redirects: nothing in them for crawlers. */
const PAGES = ["/dashboard", "/go", "/lab", "/recap", "/settings"];

/**
 * Public pages are indexable; signed-in pages and the API are not. Recaps at /<username> stay
 * crawlable, so link previews can read them (each page itself says noindex). Each page is
 * blocked exactly ($, plus its query and subpaths), never as a bare prefix: "/recap" alone would
 * also block the recap of a user called "recapper". /api/ is a folder, so it stays a prefix.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...PAGES.flatMap((page) => [`${page}$`, `${page}?`, `${page}/`])],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
