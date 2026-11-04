/**
 * Sound effects, synthesised by scripts/synth-sfx.ts (CC0, ADR-0009). WAV rather than AAC: AAC
 * starts with encoder padding, which would make a pop land after the thing it belongs to.
 * Volumes sit under the music; the components that move pick the sound (components/Sfx.tsx).
 */
export const SFX = {
  /** The previous scene leaves (transition exit). */
  whoosh: { file: "audio/sfx/whoosh.wav", volume: 0.45, seconds: 0.45 },
  /** Cells settle into the new scene (transition reveal). */
  cells: { file: "audio/sfx/cells.wav", volume: 0.35, seconds: 0.35 },
  /** Something appears: a line of text, a chip, a badge. */
  pop: { file: "audio/sfx/pop.wav", volume: 0.4, seconds: 0.12 },
  /** One step of a number counting up. */
  tick: { file: "audio/sfx/tick.wav", volume: 0.25, seconds: 0.03 },
  /** A big number or title settles. */
  land: { file: "audio/sfx/land.wav", volume: 0.55, seconds: 0.25 },
  /** A bar or row grows; callers raise the pitch along a list. */
  blip: { file: "audio/sfx/blip.wav", volume: 0.35, seconds: 0.1 },
  /** A graph or heatmap draws in (one sound for the whole sweep). */
  shimmer: { file: "audio/sfx/shimmer.wav", volume: 0.4, seconds: 1.2 },
  /** The archetype reveal. */
  impact: { file: "audio/sfx/impact.wav", volume: 0.7, seconds: 1 },
} as const satisfies Record<string, { file: string; volume: number; seconds: number }>;

export type SfxName = keyof typeof SFX;
