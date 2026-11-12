import type { RecapData } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/export";
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

/**
 * Where the share card downloads from, or why there is none. Plain data, since the dashboard hands
 * it from the server to the panel: `cardLink` adds the shape. A visitor's `filename` is the name
 * without its shape; the owner's route names the file itself (Content-Disposition).
 */
export type ShareCard = { href: string; filename?: string } | { reason: string };

/** /api/card answers only the signed-in owner. */
export const OWNER_CARD: ShareCard = { href: "/api/card" };

/**
 * A visitor's card comes from the public card route under /<login>, built from the public recap.
 * Only /<login> has one; an account named like a site route lives at /u/<name>, which has none.
 */
export function shareCardFor(variant: "owner" | "public", data: RecapData): ShareCard {
  if (variant === "owner") return OWNER_CARD;
  const { login } = data.profile;
  if (isReserved(login)) return { reason: "There is no share card for this name yet." };
  return {
    href: `${recapPath(login)}/card`,
    filename: `wrapyourgit-${data.meta.year}-${login}`,
  };
}

/** The card's link in one of the video shapes, or null when there is no card. */
export function cardLink(
  card: ShareCard,
  format: ExportFormat,
): { href: string; filename?: string } | null {
  if (!("href" in card)) return null;
  return {
    href: `${card.href}?format=${format}`,
    ...(card.filename ? { filename: `${card.filename}-${format}.png` } : {}),
  };
}
