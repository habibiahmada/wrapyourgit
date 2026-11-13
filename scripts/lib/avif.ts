/**
 * AVIF copies of the baked art (ADR-0013), written next to the WebP and PNG. An AVIF keeps its
 * alpha as a second, grey track, so the colour and the alpha are split before encoding: without
 * the split, ffmpeg's AVIF muxer drops the alpha and a loop would cover the still under it.
 *
 * AV1 at these settings weighs about a fifth of the WebP loop and half the WebP still for the
 * same look. Browsers without AVIF keep the WebP (Art's <picture> lists AVIF first).
 */

import { $ } from "bun";

/** Constant quality: lower is better. The loops move, so they can take a little more loss. */
const LOOP_CRF = 36;
const STILL_CRF = 30;

const split = (scale: string) =>
  `[0:v]${scale}format=yuva420p,split[colour][a];[a]alphaextract[alpha]`;
const scaleTo = (width?: number) => (width ? `scale=${width}:-1:flags=lanczos,` : "");

/** A looping AVIF from numbered PNG frames, e.g. `dir/%02d.png`. */
export async function avifLoop(pattern: string, fps: number, out: string, width?: number) {
  await $`ffmpeg -y -loglevel error -framerate ${fps} -i ${pattern} -filter_complex ${split(scaleTo(width))} -map [colour] -map [alpha] -c:v libaom-av1 -crf ${LOOP_CRF} -b:v 0 -cpu-used 4 -still-picture 0 ${out}`.quiet();
}

/** A still AVIF from one PNG or WebP still. */
export async function avifStill(from: string, out: string, width?: number) {
  await $`ffmpeg -y -loglevel error -i ${from} -filter_complex ${split(scaleTo(width))} -map [colour] -map [alpha] -frames:v 1 -c:v libaom-av1 -crf ${STILL_CRF} -b:v 0 -cpu-used 4 -still-picture 1 ${out}`.quiet();
}
