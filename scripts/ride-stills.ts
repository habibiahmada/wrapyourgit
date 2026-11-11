/**
 * Renders the rest frame of one stop of the story ride in three formats, for checking a station
 * by eye. Run from the repository root:
 *
 *   bun scripts/ride-stills.ts <kind> [outDir] [--fixture <name>] [--offset <frames>] [--format <id>]
 *
 *   bun scripts/ride-stills.ts languages
 *   bun scripts/ride-stills.ts projects /tmp/claude-1000/ride-stills --fixture edge-long-names
 *   bun scripts/ride-stills.ts languages --offset -20     # 20 frames before the rest: mid-build
 *   bun scripts/ride-stills.ts closing --format 1x1       # one format instead of the default three
 *
 * <kind> is one of the ride's stops (RIDE_KINDS). Fixtures and defaults are those of
 * scripts/world-stills.ts. Writes `<outDir>/ride-<kind>[-<fixture>]-<format>.png` for 9x16, 4x5
 * and 16x9 (outDir defaults to /tmp/claude-1000/ride-stills/). If Chrome cannot be downloaded,
 * set REMOTION_BROWSER_EXECUTABLE to an installed headless shell.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type RecapData, VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { toPublicRecap } from "../packages/analytics/src/public";
import {
  busyRecap,
  emptyRecap,
  provisionalRecap,
} from "../packages/video/src/fixtures/edge-recaps";
import { sampleRecap } from "../packages/video/src/fixtures/sample-recap";
import { buildRide } from "../packages/video/src/world/ride/model";
import { RIDE_KINDS } from "../packages/video/src/world/ride/stops";
import { renderSceneStill } from "./lib/still";

const FIXTURES: Record<string, RecapData> = {
  sample: sampleRecap,
  // What a visitor sees: the landing page's frames come from this, never from the raw sample.
  "public-sample": (() => {
    const pub = toPublicRecap(sampleRecap);
    return { ...pub, meta: { ...pub.meta, scope: "public" } };
  })(),
  "edge-empty": emptyRecap,
  "edge-long-names": busyRecap,
  "edge-provisional": provisionalRecap,
  "edge-one-language": {
    ...sampleRecap,
    languages: { top: [{ name: "Rust", color: "#dea584", share: 1 }], distinctCount: 1 },
  },
};
const DEFAULT_FORMATS: VideoFormatId[] = ["9x16", "4x5", "16x9"];

function usage(message: string): never {
  console.error(`${message}
Usage: bun scripts/ride-stills.ts <kind> [outDir] [--fixture <name>] [--offset <frames>] [--format <id>]
Kinds: ${RIDE_KINDS.join(", ")}
Fixtures: ${Object.keys(FIXTURES).join(", ")}`);
  process.exit(1);
}

const positional: string[] = [];
let fixture = "sample";
let offset = 0;
let only: string | undefined;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i] as string;
  if (arg === "--fixture") fixture = args[++i] ?? usage("--fixture needs a name");
  else if (arg === "--offset") offset = Number(args[++i]);
  else if (arg === "--format") only = args[++i] ?? usage("--format needs an id");
  else positional.push(arg);
}
const [kind, outDir = "/tmp/claude-1000/ride-stills/"] = positional;
if (!kind || !(RIDE_KINDS as readonly string[]).includes(kind)) usage(`Unknown kind: ${kind}`);
const data = FIXTURES[fixture] ?? usage(`Unknown fixture: ${fixture}`);
if (!Number.isInteger(offset)) usage("--offset must be a whole number of frames");

if (only !== undefined && !(only in VIDEO_FORMATS)) usage(`Unknown format: ${only}`);
const FORMATS = only ? [only as VideoFormatId] : DEFAULT_FORMATS;

await mkdir(outDir, { recursive: true });
const suffix = fixture === "sample" ? "" : `-${fixture}`;
for (const format of FORMATS) {
  // The same model the composition builds (video mode at VIDEO_FPS), so the frames line up.
  const { stops, timeline } = buildRide(data, VIDEO_FORMATS[format], "video", VIDEO_FPS);
  const i = stops.findIndex((s) => s.kind === kind);
  if (i < 0) {
    console.log(`No ${kind} stop in the ${fixture} ride; skipped.`);
    process.exit(0);
  }
  const rest = timeline.stopFrames[i] as number;
  const frame = Math.min(timeline.durationInFrames - 1, Math.max(0, rest + offset));
  const png = await renderSceneStill(data, `ride-${format}`, frame);
  const file = join(outDir, `ride-${kind}${suffix}-${format}.png`);
  await writeFile(file, png);
  console.log(`${file} (frame ${frame})`);
}
process.exit(0);
