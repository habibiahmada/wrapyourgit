/*
 * File names for everything a recap downloads as. Kept apart from export.ts, which pulls in the
 * ride and Remotion, so server code (the card route, the end screen) can name a file without them.
 */

/** A login as it may appear in a file name: lower case, letters, digits and hyphens only. */
export const fileSlug = (login: string) => login.toLowerCase().replace(/[^a-z0-9-]/g, "-");

/**
 * The summary card's file name, for /api/card's Content-Disposition and the visitor's download.
 * Slugged like the other files, so the header never relies on GitHub's login rules.
 */
export function cardFileName(year: number, login: string): string {
  return `wrapyourgit-${year}-${fileSlug(login)}.png`;
}
