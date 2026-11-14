import { VIDEO_FPS } from "@wyg/schema";

/**
 * The story world's soundtrack (ADR-0030): "Traveling in your mind" by Loyalty Freak Music, CC0,
 * prepared from the published MP3 by scripts/prepare-world-track.ts, which also checks the file
 * against these numbers.
 *
 * The file plays from the top once, then repeats its loop region for as long as the story lasts.
 * The script stretches the track by a few hundredths of a percent and pads its start so both loop
 * points fall on whole frames at 30 fps: the MP4's loop then has no rounding, and the web's
 * loopStart/loopEnd are the same instants. The last moments before the loop end are crossfaded
 * into what precedes the loop start, so the jump back joins without a seam.
 */
export const WORLD_TRACK = {
  file: "audio/world-traveling-v1.m4a",
  /** Length of the file. Past the loop end it holds a copy of the loop's first second. */
  seconds: 180,
  /** Loop region, in frames at LOOP_FPS: 1:46.4 to 2:59.0, the source's bars 38 to 64. */
  loop: { startFrame: 3193, endFrame: 5370 },
  /**
   * Gain the music plays at, on the web and in the video. The maintainer found the file at full
   * level a little loud under the effects and settled on 0.8; the EQ added in #161 takes 1.4 dB
   * of bass energy out of the file, so 0.94 keeps the same loudness as that 0.8 did.
   */
  volume: 0.94,
  /** The video fades the music out over its last this many seconds. */
  fadeSeconds: 1.5,
} as const;

/** The frame rate the loop points are whole frames at: the video's. */
export const LOOP_FPS = VIDEO_FPS;

/** Loop points in seconds of the file, for Web Audio's loopStart/loopEnd. */
export function worldLoopSeconds(): { start: number; end: number } {
  return {
    start: WORLD_TRACK.loop.startFrame / LOOP_FPS,
    end: WORLD_TRACK.loop.endFrame / LOOP_FPS,
  };
}

/** The loop region in frames at `fps`. */
export function worldLoopFrames(fps = LOOP_FPS): { start: number; end: number } {
  return {
    start: (WORLD_TRACK.loop.startFrame * fps) / LOOP_FPS,
    end: (WORLD_TRACK.loop.endFrame * fps) / LOOP_FPS,
  };
}
