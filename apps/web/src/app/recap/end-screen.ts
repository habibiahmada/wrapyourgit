import type { RecapData } from "@wyg/schema";
import { cardFileName } from "@wyg/video/file-name";
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

/** A signed-in visitor already has a recap of their own, so they are sent to it, not to sign in. */
export function endScreenFor(
  variant: "owner" | "public",
  { signedIn = false }: { signedIn?: boolean } = {},
): EndScreen {
  return variant === "owner" || signedIn ? OWNER_END : PUBLIC_END;
}

/** The share card's download link, or why there is none. */
export type ShareCard =
  | {
      href: string;
      filename?: string;
      /** The owner's second card, which counts private work and says so (owner-card.ts). */
      privateHref?: string;
    }
  | { reason: string };

/** /api/card names the files itself (Content-Disposition). */
export const OWNER_CARD: ShareCard = { href: "/api/card", privateHref: "/api/card?with=private" };

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
    filename: cardFileName(data.meta.year, login),
  };
}
