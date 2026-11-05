/**
 * Whether this server can render the chapter slides (1-9). They need the Bun worker and headless
 * Chrome (ADR-0011), which a serverless host such as Vercel doesn't have. The letter slide (10)
 * and the share card are next/og and render everywhere, so they don't depend on this.
 *
 * `SLIDE_EXPORTS=on|off` decides explicitly. Without it: off on Vercel (it sets `VERCEL=1`), on
 * everywhere else.
 */
export function slideExportsAvailable(env: Record<string, string | undefined> = process.env) {
  const setting = env.SLIDE_EXPORTS?.trim().toLowerCase();
  if (setting === "on") return true;
  if (setting === "off") return false;
  return !env.VERCEL;
}

/** Slide 10, the letter, is drawn with next/og and works on every host. */
export const LETTER_INDEX = 9;
