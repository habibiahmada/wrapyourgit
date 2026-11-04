import { EDITION_YEAR } from "@wyg/schema";

/*
 * Facts about the site itself, in one place: metadata, robots, sitemap, the manifest and JSON-LD
 * all read from here. public/llms.txt repeats the URL by hand (it is a static file); change both.
 */

/** Where the site lives in production. Local and staging set APP_URL to their own origin. */
export const PRODUCTION_URL = "https://wrapyourgit.habibiahmada.dev";

/** The site's origin with no trailing slash. */
export function siteUrl(): string {
  return (process.env.APP_URL || PRODUCTION_URL).replace(/\/+$/, "");
}

export const SITE = {
  name: "WrapYourGit",
  title: `WrapYourGit ${EDITION_YEAR}: every green square has a story`,
  tagline: "Every green square has a story. Here's yours, in motion.",
  description: `Sign in with GitHub and watch your ${EDITION_YEAR} play back as an animated story: contributions, streaks, languages, your developer archetype and a letter from Cell. Read-only, and yours to delete.`,
  author: {
    name: "Habibi Ahmad Aziz",
    handle: "habibiahmada",
    url: "https://habibiahmada.dev",
    github: "https://github.com/habibiahmada",
  },
  keywords: [
    "GitHub wrapped",
    `GitHub wrapped ${EDITION_YEAR}`,
    "GitHub year in review",
    `GitHub recap ${EDITION_YEAR}`,
    "GitHub stats",
    "contribution graph",
    "developer year in review",
    "coding year recap",
    "developer archetype",
    "GitHub streak",
  ],
  themeColor: "#0d1117",
} as const;

/**
 * Open Graph fields every page shares. Next.js merges `openGraph` shallowly: a page that sets
 * any openGraph field replaces the layout's whole object, so pages spread this first.
 */
export const OPEN_GRAPH = {
  type: "website",
  siteName: SITE.name,
  locale: "en_US",
  title: SITE.title,
  description: SITE.description,
} as const;
