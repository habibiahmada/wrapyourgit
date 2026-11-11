import type { RecapData } from "@wyg/schema";
import { isReserved, recapPath } from "@/server/routes";

export type EndLink = {
  label: string;
  href: string;
  /** A route handler, not a page: a plain link, since client navigation can't follow it. */
  route: boolean;
};

/** What the screen after the closing stop offers, under the files. */
export type EndScreen = { exports: true; links: readonly EndLink[] };

const OWNER_END: EndScreen = {
  exports: true,
  links: [{ label: "Go to dashboard", href: "/dashboard", route: false }],
};

/*
 * Sign-in takes no return path; it lands on the new user's own /<login>, which is the point of
 * the link.
 */
const PUBLIC_END: EndScreen = {
  exports: true,
  links: [
    { label: "Make your own", href: "/", route: false },
    { label: "Sign in for your full recap", href: "/api/auth/signin", route: true },
  ],
};

export function endScreenFor(variant: "owner" | "public"): EndScreen {
  return variant === "owner" ? OWNER_END : PUBLIC_END;
}

/** The share card's download link, or why there is none. */
export type ShareCard = { href: string; filename?: string } | { reason: string };

/** /api/card names the file itself (Content-Disposition). */
export const OWNER_CARD: ShareCard = { href: "/api/card" };

/**
 * /api/card answers only the signed-in owner, so a visitor's card is the public page's link
 * preview: the same card, built from the public recap. Only /<login> has one; an account named
 * like a site route lives at /u/<name>, which has no preview image.
 */
export function shareCardFor(variant: "owner" | "public", data: RecapData): ShareCard {
  if (variant === "owner") return OWNER_CARD;
  const { login } = data.profile;
  if (isReserved(login)) return { reason: "There is no share card for this name yet." };
  return {
    href: `${recapPath(login)}/opengraph-image`,
    filename: `wrapyourgit-${data.meta.year}-${login}.png`,
  };
}
