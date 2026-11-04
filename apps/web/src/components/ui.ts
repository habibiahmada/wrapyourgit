/** Shared control styles (DESIGN.md web): flat fields, 6px radius, distinct hover/active/disabled. */
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-base font-bold motion-safe:transition-colors disabled:opacity-60";

export const button = {
  /** Persimmon with ink text (5.05:1). The one call to action per screen. */
  primary: `${base} bg-persimmon text-ink hover:bg-[#eb7350] active:bg-[#f08e70]`,
  /** Ink with paper text, for secondary actions on paper. */
  secondary: `${base} bg-ink text-paper hover:bg-[#2c2a24] active:bg-black`,
  /** Outline for low-emphasis actions; border carries the 3:1 non-text contrast. */
  quiet: `${base} border-2 border-current bg-transparent hover:bg-ink/10 active:bg-ink/20`,
} as const;
