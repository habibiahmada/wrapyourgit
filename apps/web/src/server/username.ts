/*
 * GitHub usernames as the site accepts them. Pure, so pages, route handlers and tests share it.
 */

/** GitHub's login rule: 1 to 39 letters, digits or hyphens, not starting or ending with one. */
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

/**
 * Whether GitHub could have issued this login. A name that can't is answered as missing without a
 * GitHub lookup, so junk paths spend neither the public token nor the client's hourly limit.
 */
export function isValidLogin(name: string): boolean {
  return LOGIN.test(name);
}

/**
 * What someone typed into the landing field, as a login: "@octo" and "https://github.com/octo"
 * both become "octo". Null when what is left isn't a login GitHub could have issued.
 */
export function normalizeUsername(input: string): string | null {
  const name = input
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\/$/, "")
    .replace(/^@/, "");
  return isValidLogin(name) ? name : null;
}
