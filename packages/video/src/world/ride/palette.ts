/*
 * The ride's colours: the GitHub-dark tones of the landing's isometric kit (ADR-0021), copied here
 * so the story does not import three.js. Flat colours only: a face is one colour by the way it
 * faces, and depth comes from that, never from a gradient.
 */

export type Tone = { top: string; left: string; right: string };

/** `t` of the way from `a` to `b`, clamped to 0..1. Both are #RRGGBB. */
export function mixHex(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  const k = Math.max(0, Math.min(1, t));
  return `#${[0, 1, 2]
    .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * k))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** A tone from one colour: the top a little lighter, the right face darker. */
export const toneOf = (hex: string): Tone => ({
  top: mixHex(hex, "#ffffff", 0.16),
  left: hex,
  right: mixHex(hex, "#000000", 0.3),
});

export const SKY = "#0b1220";
export const HAZE = "#16241d";
export const GROUND = "#111a16";
export const LIT = "#39d353";
export const INK = "#0d1117";
export const GREENS = ["#0e4429", "#006d32", "#26a641", "#39d353"] as const;

/** Dark ink on a light face, white on a dark one, so printed numbers always read. */
export function inkOn(hex: string): string {
  const c = (i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
  return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2) > 0.5 ? INK : "#ffffff";
}

/** The tone of a contribution level, 0 (least) to 3 (most), clamped. */
export const heat = (level: number): Tone => toneOf(GREENS[Math.max(0, Math.min(3, level))] ?? LIT);

export const TONE = {
  dim: { top: "#1b2420", left: "#161d1a", right: "#121815" },
  dark: { top: "#3a424d", left: "#2d333b", right: "#21262d" },
  mid: { top: "#6e7681", left: "#545d68", right: "#444c56" },
  gravel: { top: "#232c28", left: "#1c2420", right: "#171d1a" },
  plaza: { top: "#2a323c", left: "#1f262e", right: "#181d24" },
  soil: toneOf("#5a4634"),
  rail: toneOf("#9aa4af"),
  engine: toneOf("#1f8a3a"),
  engineDark: toneOf("#176b2c"),
  wood: toneOf("#9a7550"),
  cell: toneOf("#3fd45a"),
  cellDark: toneOf("#2ea043"),
  ink: toneOf(INK),
  lamp: toneOf("#ffd866"),
  leaf: toneOf("#2a6f66"),
  leafTop: toneOf("#368f84"),
  rock: toneOf("#4a535e"),
} satisfies Record<string, Tone>;
