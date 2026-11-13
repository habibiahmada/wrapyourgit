/**
 * Bakes every animation of Cell (ADR-0013): one LOOP_SECONDS loop per composition in Root.tsx.
 *
 *   bun scripts/render-art.ts                      # everything
 *   bun scripts/render-art.ts skin-builder head-cell
 *
 * Web art and the letterhead head go to packages/video/public/art as `<id>.webp` (looping
 * animated WebP for the pages) and `<id>.png` (one frame at the motion's peak, for reduced motion,
 * Open Graph, the story world and its letter). A city block (`skin-*`, `iso-*`) is two layers:
 * `<id>-base.webp` is a still of what stands still and `<id>.webp` loops only what moves over it.
 * An archetype's `skin-*` also gets every whole frame of its loop as `<id>/NN.webp`, which the
 * story ride plays on its canvas. Each page file also gets an AVIF copy, which the pages ask for
 * first (`<id>.avif`, `<id>-base.avif`, `<id>-still.avif`; scripts/lib/avif.ts). The web app gets
 * a copy of the folder before dev and build (scripts/sync-web-public.ts).
 *
 * Renders with the still renderer (scripts/lib/still.ts: one bundle, one browser,
 * angle-egl) and assembles with ffmpeg (libwebp_anim).
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ArchetypeId } from "@wyg/schema";
import { $ } from "bun";
import {
  BAKE_FPS,
  CELL_POSES,
  type CellPose,
  HEAD_ART_ID,
  LOOP_FRAMES,
  peakFrame,
} from "../packages/video/src/art";
import { archetypeRole } from "../packages/video/src/cast";
import { ART_IDS } from "../packages/video/src/Root";
import { DIORAMA_IDS } from "../packages/video/src/three/diorama/scenes";
import type { ChibiMotion } from "../packages/video/src/three/pose";
import { avifLoop, avifStill } from "./lib/avif";
import { renderCompositionFrames } from "./lib/still";

const publicDir = resolve(import.meta.dir, "../packages/video/public");
const artDir = join(publicDir, "art");
await mkdir(artDir, { recursive: true });

const wanted = process.argv.slice(2);
const ALL_IDS: string[] = [...ART_IDS, ...DIORAMA_IDS];
const ids = wanted.length > 0 ? ALL_IDS.filter((id) => wanted.includes(id)) : ALL_IDS;
const frames = Array.from({ length: LOOP_FRAMES }, (_, i) => i);
/** Width of a single frame of an archetype's loop: the ride shows it up to about 800 px wide. */
const FRAME_WIDTH = 900;

/** The motion an art id shows, to pick its still frame. */
function motionOf(id: string): ChibiMotion {
  if (id === "hero-cast") return "wave";
  if (id === HEAD_ART_ID) return "groove";
  if (id === "iso-letter") return "think";
  if (id === "iso-privacy" || id === "iso-closing") return "proud";
  if (id.startsWith("cutout-cell-")) return CELL_POSES[id.slice(12) as CellPose].motion;
  return archetypeRole(id.replace(/^(cutout|skin)-/, "") as ArchetypeId).motion;
}

/**
 * A city block (`skin-*`, `iso-*`) ships to the pages in two layers (ADR-0022): a still of what
 * stands still and a loop of only what moves. A loop of the whole picture weighed about a megabyte
 * each, because an animated WebP writes the whole changed rectangle again on every frame and the
 * movers are spread over all of it; the still part costs its bytes once this way.
 */
const layered = (id: string) => id.startsWith("skin-") || id.startsWith("iso-");
/** The still layer is cheap, so it is wider than the loop: sharp on a dense screen. */
const BASE_WIDTH = 960;

const name = (frame: number) => String(frame).padStart(2, "0");

/** Writes rendered frames as `NN.png` into a new folder under `work`, and returns the folder. */
async function dump(work: string, folder: string, rendered: Map<number, Uint8Array>) {
  const dir = join(work, folder);
  await mkdir(dir, { recursive: true });
  for (const [frame, png] of rendered) await writeFile(join(dir, `${name(frame)}.png`), png);
  return dir;
}

/** One still WebP from a PNG. */
async function still(from: string, width: number, quality: number, to: string) {
  if (Bun.which("ffmpeg")) {
    await $`ffmpeg -y -loglevel error -i ${from} -vf scale=${width}:-1:flags=lanczos -c:v libwebp -quality ${quality} -pix_fmt yuva420p ${to}`.quiet();
  } else {
    await $`convert ${from} -resize ${width}x -quality ${quality} -define webp:method=4 ${to}`.quiet();
  }
}

for (const id of ids) {
  const work = await mkdtemp(join(tmpdir(), "wyg-art-"));
  const two = layered(id);
  const skin = id.startsWith("skin-");
  const peak = peakFrame(motionOf(id));
  // The whole picture: every frame when the loop ships whole or the ride plays it, else its still.
  const whole = await renderCompositionFrames(`art-${id}`, !two || skin ? frames : [peak]);
  // What the page loops: the whole picture, or only its movers over nothing.
  const loop = two ? await renderCompositionFrames(`art-${id}`, frames, { pass: "movers" }) : whole;
  const loopDir = await dump(work, "loop", loop);

  // Pages show the art at most ~600 CSS px wide: 720 px covers that at 1.2x without the weight.
  const width = id === HEAD_ART_ID ? 360 : 720;
  const out = join(artDir, `${id}.webp`);
  if (Bun.which("ffmpeg")) {
    await $`ffmpeg -y -loglevel error -framerate ${BAKE_FPS} -i ${join(loopDir, "%02d.png")} -vf scale=${width}:-1:flags=lanczos -c:v libwebp_anim -lossless 0 -quality 72 -compression_level 4 -loop 0 -pix_fmt yuva420p ${out}`.quiet();
    await avifLoop(join(loopDir, "%02d.png"), BAKE_FPS, join(artDir, `${id}.avif`), width);
  } else {
    // No ffmpeg (Remotion's build has no WebP encoder): ImageMagick writes the same looping WebP.
    const pngs = [...loop.keys()].sort((a, b) => a - b).map((f) => join(loopDir, `${name(f)}.png`));
    await $`convert -delay 1x${BAKE_FPS} -loop 0 ${pngs} -resize ${width}x -quality 72 -define webp:method=4 ${out}`.quiet();
  }
  if (two) {
    // The layer under the loop: everything that stands still, once.
    const base = await renderCompositionFrames(`art-${id}`, [0], { pass: "base" });
    const baseDir = await dump(work, "base", base);
    await still(join(baseDir, "00.png"), BASE_WIDTH, 82, join(artDir, `${id}-base.webp`));
    if (Bun.which("ffmpeg")) {
      await avifStill(join(baseDir, "00.png"), join(artDir, `${id}-base.avif`), BASE_WIDTH);
    }
  }
  // The story ride plays an archetype's loop frame by frame on its canvas, which draws single
  // images: every frame of a `skin-*`, whole, also goes to `art/<id>/NN.webp`.
  if (skin) {
    const wholeDir = await dump(work, "whole", whole);
    const framesDir = join(artDir, id);
    await rm(framesDir, { recursive: true, force: true });
    await mkdir(framesDir, { recursive: true });
    for (const frame of [...whole.keys()].sort((a, b) => a - b)) {
      await still(
        join(wholeDir, `${name(frame)}.png`),
        FRAME_WIDTH,
        84,
        join(framesDir, `${name(frame)}.webp`),
      );
    }
  }
  const stillPng = whole.get(peak);
  if (stillPng) {
    await writeFile(join(artDir, `${id}.png`), stillPng);
    if (Bun.which("ffmpeg"))
      await avifStill(join(artDir, `${id}.png`), join(artDir, `${id}-still.avif`));
  }
  console.log(two ? `art/${id}.webp + -base.webp + .png` : `art/${id}.webp + .png`);
  await rm(work, { recursive: true, force: true });
}
process.exit(0);
