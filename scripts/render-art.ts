/**
 * Bakes every animation of Cell (ADR-0013): one LOOP_SECONDS loop per composition in Root.tsx.
 *
 *   bun scripts/render-art.ts                      # everything
 *   bun scripts/render-art.ts skin-builder head-cell
 *
 * Web art and the letterhead head go to packages/video/public/art as `<id>.webp` (looping
 * animated WebP for the pages) and `<id>.png` (one frame at the motion's peak, for reduced motion,
 * Open Graph, the story world and its letter). An archetype's `skin-*` also gets every frame of
 * its loop as `<id>/NN.webp`, which the story ride plays on its canvas. The web app gets a copy of the folder before dev
 * and build (scripts/sync-web-public.ts).
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

for (const id of ids) {
  const work = await mkdtemp(join(tmpdir(), "wyg-art-"));
  const rendered = await renderCompositionFrames(`art-${id}`, frames);
  for (const [frame, png] of rendered) {
    await writeFile(join(work, `${String(frame).padStart(2, "0")}.png`), png);
  }

  // Pages show the art at most ~600 CSS px wide: 720 px covers that at 1.2x without the weight.
  const width = id === HEAD_ART_ID ? 360 : 720;
  const out = join(artDir, `${id}.webp`);
  if (Bun.which("ffmpeg")) {
    await $`ffmpeg -y -loglevel error -framerate ${BAKE_FPS} -i ${join(work, "%02d.png")} -vf scale=${width}:-1:flags=lanczos -c:v libwebp_anim -lossless 0 -quality 72 -compression_level 4 -loop 0 -pix_fmt yuva420p ${out}`.quiet();
  } else {
    // No ffmpeg (Remotion's build has no WebP encoder): ImageMagick writes the same looping WebP.
    const pngs = [...rendered.keys()]
      .sort((a, b) => a - b)
      .map((frame) => join(work, `${String(frame).padStart(2, "0")}.png`));
    await $`convert -delay 1x${BAKE_FPS} -loop 0 ${pngs} -resize ${width}x -quality 72 -define webp:method=4 ${out}`.quiet();
  }
  // The story ride plays an archetype's loop frame by frame on its canvas, which draws single
  // images: every frame of a `skin-*` also goes to `art/<id>/NN.webp`.
  if (id.startsWith("skin-")) {
    const framesDir = join(artDir, id);
    await rm(framesDir, { recursive: true, force: true });
    await mkdir(framesDir, { recursive: true });
    for (const frame of [...rendered.keys()].sort((a, b) => a - b)) {
      const name = String(frame).padStart(2, "0");
      const from = join(work, `${name}.png`);
      const to = join(framesDir, `${name}.webp`);
      if (Bun.which("ffmpeg")) {
        await $`ffmpeg -y -loglevel error -i ${from} -vf scale=${FRAME_WIDTH}:-1:flags=lanczos -c:v libwebp -quality 84 -pix_fmt yuva420p ${to}`.quiet();
      } else {
        await $`convert ${from} -resize ${FRAME_WIDTH}x -quality 84 -define webp:method=4 ${to}`.quiet();
      }
    }
  }
  const still = rendered.get(peakFrame(motionOf(id)));
  if (still) await writeFile(join(artDir, `${id}.png`), still);
  console.log(`art/${id}.webp + .png`);
  await rm(work, { recursive: true, force: true });
}
process.exit(0);
