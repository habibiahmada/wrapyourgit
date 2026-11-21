/*
 * The README images' options, apart from the drawing code: the dashboard's picker runs in the
 * browser and needs these names, not the embedded art that badge.ts carries.
 */

export const BADGE_SHOWS = ["contributions", "streak", "days", "language", "archetype"] as const;
export type BadgeShow = (typeof BADGE_SHOWS)[number];

/** At most this many values in one badge, so it stays a badge. */
export const MAX_SHOWS = 4;

export type CardSide = "left" | "right";
export type CardLayout = "wide" | "compact";
