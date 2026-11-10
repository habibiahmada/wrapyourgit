/**
 * Bakes every animation of Cell (ADR-0013): one LOOP_SECONDS loop per composition in Root.tsx.
 *
 *   bun scripts/render-art.ts                      # everything
 *   bun scripts/render-art.ts skin-builder head-cell
 *
 * Web art and the letterhead head go to packages/video/public/art as `<id>.webp` (looping
 * animated WebP for the pages) and `<id>.png` (one frame at the motion's peak, for reduced motion,
 * Open Graph, the story world and its letter). The web app gets a copy of the folder before dev
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
import type { ChibiMotion } from "../packages/video/src/three/pose";
import { renderCompositionFrames } from "./lib/still";

const publicDir = resolve(import.meta.dir, "../packages/video/public");
const artDir = join(publicDir, "art");
await mkdir(artDir, { recursive: true });

const wanted = process.argv.slice(2);
const ids = wanted.length > 0 ? ART_IDS.filter((id) => wanted.includes(id)) : ART_IDS;
const frames = Array.from({ length: LOOP_FRAMES }, (_, i) => i);

/** The motion an art id shows, to pick its still frame. */
function motionOf(id: string): ChibiMotion {
  if (id === "hero-cast") return "wave";
  if (id === HEAD_ART_ID) return "groove";
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
  await $`ffmpeg -y -loglevel error -framerate ${BAKE_FPS} -i ${join(work, "%02d.png")} -vf scale=${width}:-1:flags=lanczos -c:v libwebp_anim -lossless 0 -quality 72 -compression_level 4 -loop 0 -pix_fmt yuva420p ${join(artDir, `${id}.webp`)}`.quiet();
  const still = rendered.get(peakFrame(motionOf(id)));
  if (still) await writeFile(join(artDir, `${id}.png`), still);
  console.log(`art/${id}.webp + .png`);
  await rm(work, { recursive: true, force: true });
}
process.exit(0);
