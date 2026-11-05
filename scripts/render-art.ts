/**
 * Bakes the art (Cell cutouts, Cell in front of photos for each archetype, the hero) into PNGs for
 * places that don't run WebGL: the web pages, loading states, the OG image and the letter slide.
 *
 *   bun scripts/render-art.ts            # every id in ART_IDS
 *   bun scripts/render-art.ts skin-builder hero-cast
 *
 * Writes packages/video/public/art/<id>.png (apps/web/public/art links there). Re-run after
 * changing anything in packages/video/src/three, cast.ts or photos. Bundles the composition once
 * and renders every still with one browser (apps/renderer/src/still.ts), on angle-egl: headless
 * `angle` can't create a WebGL context on Linux.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderSceneStill } from "../apps/renderer/src/still";
import { sampleRecap } from "../packages/video/src/fixtures/sample-recap";
import { ART_IDS } from "../packages/video/src/Root";

const outDir = resolve(import.meta.dir, "../packages/video/public/art");
await mkdir(outDir, { recursive: true });

const wanted = process.argv.slice(2);
const ids = wanted.length > 0 ? ART_IDS.filter((id) => wanted.includes(id)) : ART_IDS;

for (const id of ids) {
  // Frame 45 (1.5 s): characters are mid-gesture. The art composition ignores the recap data.
  const png = await renderSceneStill(sampleRecap, `art-${id}`, 45);
  await writeFile(resolve(outDir, `${id}.png`), png);
  console.log(`art/${id}.png`);
}
process.exit(0);
