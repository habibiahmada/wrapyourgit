/**
 * Renders the landing page's frames of the story (apps/web/public/landing): the twelve stops the
 * reel and the prints show at 4:5 (540 x 675) and the three acts at 16:9 (960 x 540), from the
 * public sample, as WebP. Stills leave the progress bar out (#197). Before this script the PNGs
 * from `ride-stills.ts` were resized and converted by hand.
 *
 *   bun scripts/landing-frames.ts
 */
import { dirname, join, resolve } from "node:path";
import { VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { toPublicRecap } from "../packages/analytics/src/public";
import { sampleRecap } from "../packages/video/src/fixtures/sample-recap";
import { buildRide } from "../packages/video/src/world/ride/model";
import { renderSceneStill } from "./lib/still";

const root = resolve(import.meta.dir, "..");
const out = join(root, "apps/web/public/landing");
// sharp is Next's optional dependency, so it resolves from the web app, not from the root.
const next = Bun.resolveSync("next/package.json", join(root, "apps/web"));
const sharp = (await import(Bun.resolveSync("sharp", dirname(next)))).default;

// What a visitor sees: the landing's frames come from the public projection, never the raw sample.
const pub = toPublicRecap(sampleRecap);
const data = { ...pub, meta: { ...pub.meta, scope: "public" as const } };

const STOPS = [
  "hello",
  "first-day",
  "city",
  "busiest",
  "rhythm",
  "languages",
  "projects",
  "community",
  "engineering",
  "archetype",
  "versus",
  "closing",
];
/** One picture to an act, in the acts' order (frames.ts ACT_IMAGES). */
const ACTS = ["city", "rhythm", "archetype"];

async function frame(kind: string, format: VideoFormatId, width: number, file: string) {
  // The same model the composition builds (video mode at VIDEO_FPS), so the frames line up.
  const { stops, timeline } = buildRide(data, VIDEO_FORMATS[format], "video", VIDEO_FPS);
  const i = stops.findIndex((s) => s.kind === kind);
  const rest = timeline.stopFrames[i];
  if (i < 0 || rest === undefined) throw new Error(`No ${kind} stop in the public sample`);
  const png = await renderSceneStill(data, `ride-${format}`, rest);
  const webp = await sharp(png).resize({ width, kernel: "lanczos3" }).webp({ quality: 82 }).toBuffer();
  await Bun.write(join(out, file), webp);
  console.log(`${file}: ${Math.round(webp.length / 1024)} KB`);
}

for (const kind of STOPS) await frame(kind, "4x5", 540, `ride-${kind}.webp`);
for (const [n, kind] of ACTS.entries()) await frame(kind, "16x9", 960, `act-${n + 1}.webp`);
process.exit(0);
