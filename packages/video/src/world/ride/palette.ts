/*
 * The ride's colours: the GitHub-dark tones of the landing's isometric kit (ADR-0021), copied here
 * so the story does not import three.js. Flat colours only: a face is one colour by the way it
 * faces, and depth comes from that, never from a gradient.
 */

export type Tone = { top: string; left: string; right: string };

/** Each colour's channels, parsed once: the fog mixes every face of every frame (issue #141). */
const CHANNELS = new Map<string, readonly [number, number, number]>();
const HEX_BYTE = Array.from({ length: 256 }, (_, v) => v.toString(16).padStart(2, "0"));

function channels(hex: string): readonly [number, number, number] {
  let rgb = CHANNELS.get(hex);
  if (!rgb) {
    const at = (i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
    rgb = [at(0), at(1), at(2)];
    // Fogged colours are mixed again (an edge lighter than its face), so the keys keep coming;
    // starting over now and then keeps the cache small without losing the palette for long.
    if (CHANNELS.size >= 4096) CHANNELS.clear();
    CHANNELS.set(hex, rgb);
  }
  return rgb;
}

/** Two hex digits for a channel; anything outside 0..255 (a NaN) is written as before. */
const byte = (v: number) => HEX_BYTE[v] ?? v.toString(16).padStart(2, "0");

/** `t` of the way from `a` to `b`, clamped to 0..1. Both are #RRGGBB. */
export function mixHex(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return `#${byte(Math.round(ar + (br - ar) * k))}${byte(Math.round(ag + (bg - ag) * k))}${byte(
    Math.round(ab + (bb - ab) * k),
  )}`;
}

/** A tone from one colour: the top a little lighter, the right face darker. */
export const toneOf = (hex: string): Tone => ({
  top: mixHex(hex, "#ffffff", 0.16),
  left: hex,
  right: mixHex(hex, "#000000", 0.3),
});

export const SKY = "#0b1220";
/** What the far land fades into: the night sky's own blue, so distance reads as sky. */
export const HAZE = "#141e33";
/**
 * What lies under the horizon where there is no land: the year's ground is an island (backdrop.ts)
 * and this is the night under and round it, a little darker than the sky above.
 */
export const GROUND = "#070c16";
/** The land's two tones: its plots are laid in a checker, so the ground reads as ground. */
export const LAND = ["#17251e", "#1c2d24"] as const;
/** The island's side, and the lit line along its top edge. */
export const CLIFF = "#0c1510";
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
