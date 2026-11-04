import type { MetadataRoute } from "next";

/** Public pages are indexable; signed-in pages and the API are not. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/recap", "/settings"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
