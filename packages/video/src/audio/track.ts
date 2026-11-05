/**
 * Soundtrack metadata. Scene lengths are whole beats of this track, so cuts land on the beat.
 * The track is synthesised by scripts/synth-track.ts from these same numbers
 * (ADR-0007: original, CC0). Section starts match scene starts; timeline.test.ts checks it.
 */
export const TRACK = {
  file: "audio/wrapyourgit-120bpm-v2.m4a",
  bpm: 120,
  /** Time of beat 0 in the file. */
  offsetMs: 0,
  beats: 132,
  /**
   * Beat indices where sections start. Drop: kick enters on the first cut (contributions).
   * Climax: the identity reveal. Outro: closing, fading out.
   */
  sections: { intro: 0, drop: 8, climax: 102, outro: 118 },
  /**
   * The web story waits on each chapter, so it loops this stretch after playing up to its end:
   * full arrangement, starts and ends on the same chord, nothing building inside (track.test.ts).
   */
  loop: { startBeat: 40, endBeat: 88 },
} as const;

/** Loop points in seconds of the file, for Web Audio's loopStart/loopEnd. */
export function loopSeconds(): { start: number; end: number } {
  const beat = 60 / TRACK.bpm;
  return {
    start: TRACK.offsetMs / 1000 + TRACK.loop.startBeat * beat,
    end: TRACK.offsetMs / 1000 + TRACK.loop.endBeat * beat,
  };
}

/** Frames for `count` beats at `fps`. Integer for 120 BPM at 30 fps (15 frames per beat). */
export function beats(count: number, fps = 30): number {
  return Math.round((count * 60 * fps) / TRACK.bpm);
}
