/**
 * Soundtrack metadata. Scene lengths are whole beats of this track, so cuts land on the beat.
 * The placeholder is synthesised by scripts/synth-placeholder-track.ts from these same numbers;
 * the real track (M4) replaces the file and this metadata together.
 */
export const TRACK = {
  file: "audio/placeholder-120bpm.wav",
  bpm: 120,
  /** Time of beat 0 in the file. */
  offsetMs: 0,
  beats: 64,
  /** Beat indices where sections start. The drop is where the kick enters. */
  sections: { intro: 0, drop: 8, outro: 56 },
} as const;

/** Frames for `count` beats at `fps`. Integer for 120 BPM at 30 fps (15 frames per beat). */
export function beats(count: number, fps = 30): number {
  return Math.round((count * 60 * fps) / TRACK.bpm);
}
