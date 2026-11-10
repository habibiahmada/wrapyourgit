/**
 * The story world's soundtrack (ADR-0007: original, CC0), synthesised by
 * scripts/synth-world-track.ts from these same numbers. Calm and in A minor, like the effects, so
 * a stop can rest on it for minutes and the arrival sounds sit in key.
 *
 * Intro (beats 0-32) has no drums; the loop region (32-160) is the full, level arrangement and is
 * rendered circular, so it repeats without a seam; the outro (160-192) thins out and fades.
 */
export const WORLD_TRACK = {
  file: "audio/world-90bpm-v1.m4a",
  bpm: 90,
  /**
   * Time of beat 0 in the file. FFmpeg's MP4 muxer writes an edit list over the AAC priming
   * samples, and decoders that honour it (browsers' decodeAudioData, FFmpeg) start on beat 0;
   * the synth script measures the decoded offset and fails if it isn't zero.
   */
  offsetMs: 0,
  beats: 192,
  loop: { startBeat: 32, endBeat: 160 },
} as const;

/** Loop points in seconds of the file, for Web Audio's loopStart/loopEnd. */
export function worldLoopSeconds(): { start: number; end: number } {
  const beat = 60 / WORLD_TRACK.bpm;
  return {
    start: WORLD_TRACK.offsetMs / 1000 + WORLD_TRACK.loop.startBeat * beat,
    end: WORLD_TRACK.offsetMs / 1000 + WORLD_TRACK.loop.endBeat * beat,
  };
}

/** Frames for `count` beats of this track at `fps` (20 frames per beat at 30 fps). */
export function worldBeats(count: number, fps = 30): number {
  return Math.round((count * 60 * fps) / WORLD_TRACK.bpm);
}
