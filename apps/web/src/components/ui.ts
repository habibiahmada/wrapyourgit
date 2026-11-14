/** Shared control styles (DESIGN.md web): dark buttons, 6px radius, distinct states. */
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-5 text-base font-semibold motion-safe:transition-colors disabled:opacity-60";

export const button = {
  /** The green primary: white on #1d7a3a (5.39:1), 6.23:1 hovered. The one call to action per screen. */
  primary: `${base} border-white/10 bg-green-button text-white hover:bg-[#1a6f35] active:bg-[#186a32]`,
  /** Neutral button on the dark canvas. */
  secondary: `${base} border-line bg-overlay text-fg hover:border-muted hover:bg-line active:bg-[#2f2c26]`,
  /** Low emphasis: text button with a border. */
  quiet: `${base} border-line bg-transparent text-fg hover:bg-overlay active:bg-line`,
} as const;
