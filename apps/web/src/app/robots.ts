import type { MetadataRoute } from "next";
import { siteUrl } from "@/site";

/** Public pages are indexable; signed-in pages and the API are not. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/recap", "/settings"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
