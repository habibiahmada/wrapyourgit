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
  /**
   * A bar or row grows. Comes in BLIP_STEPS pitches up the A minor pentatonic, so a list climbs
   * (playbackRate can't do it: browsers keep the pitch when the rate changes).
   */
  blip: { file: "audio/sfx/blip-0.wav", volume: 0.35, seconds: 0.1 },
  /** A graph or heatmap draws in (one sound for the whole sweep). */
  shimmer: { file: "audio/sfx/shimmer.wav", volume: 0.4, seconds: 1.2 },
  /** The archetype reveal. */
  impact: { file: "audio/sfx/impact.wav", volume: 0.7, seconds: 1 },
} as const satisfies Record<string, { file: string; volume: number; seconds: number }>;

export type SfxName = keyof typeof SFX;

/** Pitches of `blip`, as frequency ratios of A5 (A minor pentatonic). */
export const BLIP_STEPS = [1, 1.189, 1.335, 1.498, 1.782, 2, 2.378, 2.67] as const;

/** File of a sound; `step` picks a `blip` pitch and is clamped to the top note. */
export function sfxFile(name: SfxName, step = 0): string {
  if (name !== "blip") return SFX[name].file;
  const index = Math.max(0, Math.min(BLIP_STEPS.length - 1, Math.floor(step)));
  return `audio/sfx/blip-${index}.wav`;
}
