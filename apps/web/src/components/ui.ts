/** Shared control styles (DESIGN.md web): GitHub-style buttons, 6px radius, distinct states. */
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-5 text-base font-semibold motion-safe:transition-colors disabled:opacity-60";

export const button = {
  /** GitHub's green primary: white on #238636 (4.63:1). The one call to action per screen. */
  primary: `${base} border-white/10 bg-green-button text-white hover:bg-[#2ea043] active:bg-[#1f7a30]`,
  /** Neutral button on the dark canvas. */
  secondary: `${base} border-line bg-overlay text-fg hover:border-muted hover:bg-line active:bg-[#282e33]`,
  /** Low emphasis: text button with a border. */
  quiet: `${base} border-line bg-transparent text-fg hover:bg-overlay active:bg-line`,
} as const;
