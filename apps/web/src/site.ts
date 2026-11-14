import { EDITION_YEAR } from "@wyg/schema";

/*
 * Facts about the site itself, in one place: metadata, robots, sitemap, the manifest and JSON-LD
 * all read from here. public/llms.txt repeats the URL by hand (it is a static file); change both.
 */

/** Where the site lives in production. Local and staging set APP_URL to their own origin. */
export const PRODUCTION_URL = "https://wrapyourgit.com";

/** The site's origin with no trailing slash. */
export function siteUrl(): string {
  return (process.env.APP_URL || PRODUCTION_URL).replace(/\/+$/, "");
}

export const SITE = {
  name: "WrapYourGit",
  /**
   * Other names people search for, for JSON-LD `alternateName`. "GitHub Wrapped" is the generic
   * name for a yearly GitHub recap, the way people say "Spotify Wrapped" for music.
   */
  alternateNames: [
    "Wrap Your Git",
    "GitHub Wrapped by WrapYourGit",
    `GitHub Wrapped ${EDITION_YEAR}`,
  ],
  title: `WrapYourGit: your GitHub Wrapped ${EDITION_YEAR}, as an animated story`,
  tagline: "Every green square has a story. Here's yours, in motion.",
  description: `Your GitHub Wrapped for ${EDITION_YEAR}. Type any GitHub username or sign in, and watch the year play back as an animated train ride through your contributions, streaks, languages, repositories, pull requests, stars and your developer archetype. Free, read-only, and yours to delete.`,
  author: {
    name: "Habibi Ahmad Aziz",
    handle: "habibiahmada",
    url: "https://habibiahmada.dev",
    github: "https://github.com/habibiahmada",
  },
  /** The source: the project is open, and the header links to it. */
  repository: "https://github.com/habibiahmada/wrapyourgit",
  /**
   * What people type when they look for a recap of their GitHub year. Search engines read the
   * page's words more than this list; it also feeds JSON-LD `keywords`.
   */
  keywords: [
    "GitHub wrapped",
    `GitHub wrapped ${EDITION_YEAR}`,
    "wrap GitHub",
    "wrapped GitHub",
    "Git wrapped",
    "wrap your git",
    "WrapYourGit",
    "GitHub year in review",
    `GitHub year in review ${EDITION_YEAR}`,
    "GitHub recap",
    `GitHub recap ${EDITION_YEAR}`,
    "GitHub stats",
    "GitHub contributions",
    "contribution graph",
    "GitHub streak",
    "GitHub profile stats",
    "developer year in review",
    "coding year recap",
    "year in code",
    "developer archetype",
    "GitHub video recap",
  ],
  themeColor: "#12110e",
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
