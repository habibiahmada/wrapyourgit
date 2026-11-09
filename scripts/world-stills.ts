/**
 * Renders the rest frame of one stop of the story world in three formats, for checking a scene by
 * eye. Run from the repository root:
 *
 *   bun scripts/world-stills.ts <kind> [outDir] [--fixture <name>] [--offset <frames>]
 *
 *   bun scripts/world-stills.ts busiest
 *   bun scripts/world-stills.ts projects /tmp/claude-1000/world-stills/task-7 --fixture edge-long-names
 *   bun scripts/world-stills.ts hello --offset -20     # 20 frames before the rest: mid-entrance
 *
 * <kind> is a StopKind; the first stop of that kind is used. Fixtures: sample (default),
 * edge-empty, edge-long-names. Writes `<outDir>/<kind>[-<fixture>]-<format>.png` for world-9x16,
 * world-4x5 and world-16x9 (outDir defaults to /tmp/claude-1000/world-stills/). Renders through
 * apps/renderer/src/still.ts like render-art.ts: one bundle, one headless browser, video mode.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type RecapData, VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { renderSceneStill } from "../apps/renderer/src/still";
import { busyRecap, emptyRecap } from "../packages/video/src/fixtures/edge-recaps";
import { sampleRecap } from "../packages/video/src/fixtures/sample-recap";
import { buildWorld } from "../packages/video/src/world/model";
import { STOP_KINDS } from "../packages/video/src/world/stops";

const FIXTURES: Record<string, RecapData> = {
  sample: sampleRecap,
  "edge-empty": emptyRecap,
  "edge-long-names": busyRecap,
};
const FORMATS: VideoFormatId[] = ["9x16", "4x5", "16x9"];

function usage(message: string): never {
  console.error(`${message}
Usage: bun scripts/world-stills.ts <kind> [outDir] [--fixture <name>] [--offset <frames>]
Kinds: ${STOP_KINDS.join(", ")}
Fixtures: ${Object.keys(FIXTURES).join(", ")}`);
  process.exit(1);
}

const positional: string[] = [];
let fixture = "sample";
let offset = 0;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i] as string;
  if (arg === "--fixture") fixture = args[++i] ?? usage("--fixture needs a name");
  else if (arg === "--offset") offset = Number(args[++i]);
  else positional.push(arg);
}
const [kind, outDir = "/tmp/claude-1000/world-stills/"] = positional;
if (!kind || !(STOP_KINDS as readonly string[]).includes(kind)) usage(`Unknown kind: ${kind}`);
const data = FIXTURES[fixture] ?? usage(`Unknown fixture: ${fixture}`);
if (!Number.isInteger(offset)) usage("--offset must be a whole number of frames");

await mkdir(outDir, { recursive: true });
const suffix = fixture === "sample" ? "" : `-${fixture}`;
for (const format of FORMATS) {
  // The same model the composition builds (video mode at VIDEO_FPS), so the frames line up.
  const { stops, timeline } = buildWorld(data, VIDEO_FORMATS[format], "video", VIDEO_FPS);
  const i = stops.findIndex((s) => s.kind === kind);
  if (i < 0) {
    console.log(`No ${kind} stop in the ${fixture} world (nothing to draw); skipped.`);
    process.exit(0);
  }
  const rest = timeline.stopFrames[i] as number;
  const frame = Math.min(timeline.durationInFrames - 1, Math.max(0, rest + offset));
  const png = await renderSceneStill(data, `world-${format}`, frame);
  const file = join(outDir, `${kind}${suffix}-${format}.png`);
  await writeFile(file, png);
  console.log(`${file} (frame ${frame})`);
}
process.exit(0);
