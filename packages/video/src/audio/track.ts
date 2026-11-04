/**
 * Soundtrack metadata. Scene lengths are whole beats of this track, so cuts land on the beat.
 * The track is synthesised by scripts/synth-track.ts from these same numbers
 * (ADR-0007: original, CC0). Section starts match scene starts; timeline.test.ts checks it.
 */
export const TRACK = {
  file: "audio/wrapyourgit-120bpm.m4a",
  bpm: 120,
  /** Time of beat 0 in the file. */
  offsetMs: 0,
  beats: 132,
  /**
   * Beat indices where sections start. Drop: kick enters on the first cut (contributions).
   * Climax: the identity reveal. Outro: closing, fading out.
   */
  sections: { intro: 0, drop: 8, climax: 102, outro: 118 },
} as const;

/** Frames for `count` beats at `fps`. Integer for 120 BPM at 30 fps (15 frames per beat). */
export function beats(count: number, fps = 30): number {
  return Math.round((count * 60 * fps) / TRACK.bpm);
}
