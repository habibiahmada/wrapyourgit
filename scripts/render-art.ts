/**
 * Bakes the 3D art (Cell, the hero diorama, the six archetype dioramas) into PNGs for places that
 * can't run WebGL: PNG/PDF exports, reduced-motion fallbacks and loading states.
 *
 *   bun scripts/render-art.ts
 *
 * Writes apps/web/public/art/<id>.png. Re-run after changing anything in packages/video/src/three.
 * Uses angle-egl: headless `angle` can't create a WebGL context on Linux. Post effects are off
 * for stills because EffectComposer draws to its own buffer and the capture comes out empty.
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { $ } from "bun";
import { ART_IDS } from "../packages/video/src/Root";

const videoDir = resolve(import.meta.dir, "../packages/video");
const outDir = resolve(import.meta.dir, "../apps/web/public/art");
await mkdir(outDir, { recursive: true });

for (const id of ART_IDS) {
  // Frame 45 (1.5 s): the city has grown and characters are mid-gesture.
  await $`bunx remotion still src/remotion-entry.ts art-${id} ${outDir}/${id}.png --frame=45 --gl=angle-egl`
    .cwd(videoDir)
    .quiet();
  console.log(`art/${id}.png`);
}
