/*
 * Ink on paper, like the letter: the panel sits on the city, not on the site's dark canvas, so
 * ui.ts's GitHub buttons would be a second visual language here. Hover and active tint the fill;
 * disabled fades and drops the tint (`enabled:`), and the base layer sets the not-allowed cursor.
 */
const BASE =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-ink px-5 text-base font-semibold motion-safe:transition-colors disabled:opacity-50 sm:w-auto";
export const PAPER_BUTTON = {
  primary: `${BASE} bg-ink text-paper enabled:hover:bg-ink/85 enabled:active:bg-ink/70`,
  secondary: `${BASE} bg-transparent text-ink enabled:hover:bg-ink/[0.07] enabled:active:bg-ink/[0.14]`,
} as const;
