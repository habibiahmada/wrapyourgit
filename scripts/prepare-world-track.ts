/**
 * Prepares the story world's soundtrack (ADR-0030) from its published source:
 * "Traveling in your mind" by Loyalty Freak Music, CC0 1.0, on the Free Music Archive.
 *
 *   bun scripts/prepare-world-track.ts
 *
 * Downloads the MP3, checks its SHA-256, and writes packages/video/public/<WORLD_TRACK.file>
 * (AAC, stereo, 44.1 kHz) via the FFmpeg that ships with Remotion. Then it decodes the file back
 * and checks the length, the loop seam, the encoder offset and the peak against WORLD_TRACK; it
 * exits non-zero if any check fails. Nothing but the output is kept.
 *
 * What it does to the music, and why:
 * - The loop region was found by ear and by correlation: bar 38 to bar 64 of the source (86 BPM),
 *   whose following bars match closely. It holds the build and part of the final section, and the
 *   whole track up to its end (about three minutes) plays once before anything repeats.
 * - The track is resampled by a few hundredths of a percent so the loop lasts a whole number of
 *   frames at 30 fps, and its start is padded with a few milliseconds of silence so the loop end
 *   lands on a frame. Far below what an ear can hear; it lets the MP4 loop without rounding.
 * - The last CROSSFADE seconds before the loop end are crossfaded into the same stretch before the
 *   loop start, so jumping back continues the waveform it was already playing.
 * - After the loop end, the file holds a copy of the loop's first TAIL seconds, so a player that
 *   reads a little past the end still hears the loop's start.
 * - The source's level is kept; only the peak is brought to -1 dBFS.
 */

import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { $ } from "bun";
import { LOOP_FPS, WORLD_TRACK } from "../packages/video/src/audio/world-track";

const SOURCE = {
  url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Music_for_Video/Loyalty_Freak_Music/TO_CHILL_AND_STAY_AWAKE/Loyalty_Freak_Music_-_05_-_Traveling_in_your_mind.mp3",
  sha256: "ea390e17b9a5852fa4873cc112dbec33386400fd70c0739211c313fa5db0bc40",
};
/** Loop points in seconds of the decoded source: bar 38 and bar 64. */
const SOURCE_LOOP = { start: 106.4295, end: 179.0045 };
const CROSSFADE = 0.3;
const TAIL = 1;
const SAMPLE_RATE = 44_100;
const SAMPLES_PER_FRAME = SAMPLE_RATE / LOOP_FPS; // 1470, a whole number
const PEAK = 10 ** (-1 / 20);

const packageDir = resolve(import.meta.dir, "../packages/video");
const workDir = await mkdtemp(join(tmpdir(), "wyg-world-track-"));
const ffmpeg = (...args: string[]) =>
  $`bunx remotion ffmpeg -v error -y ${args}`.cwd(packageDir).quiet();

// --- Source -------------------------------------------------------------------------------------
const response = await fetch(SOURCE.url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const mp3 = new Uint8Array(await response.arrayBuffer());
const sha = createHash("sha256").update(mp3).digest("hex");
if (sha !== SOURCE.sha256) throw new Error(`Source changed: sha256 ${sha}`);
const sourceMp3 = join(workDir, "source.mp3");
await Bun.write(sourceMp3, mp3);

/** Reads a 16-bit stereo WAV into two channels. Remotion's FFmpeg has no raw-float muxer. */
async function readStereo(file: string): Promise<[Float32Array, Float32Array]> {
  const bytes = new Uint8Array(await Bun.file(file).arrayBuffer());
  const view = new DataView(bytes.buffer);
  let chunk = 12;
  while (new TextDecoder("latin1").decode(bytes.subarray(chunk, chunk + 4)) !== "data") {
    chunk += 8 + view.getUint32(chunk + 4, true);
  }
  const frames = Math.floor((bytes.length - chunk - 8) / 4);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    left[i] = view.getInt16(chunk + 8 + i * 4, true) / 0x8000;
    right[i] = view.getInt16(chunk + 10 + i * 4, true) / 0x8000;
  }
  return [left, right];
}

const sourceWav = join(workDir, "source.wav");
await ffmpeg(
  "-i",
  sourceMp3,
  "-ac",
  "2",
  "-ar",
  String(SAMPLE_RATE),
  "-c:a",
  "pcm_s16le",
  "-f",
  "wav",
  sourceWav,
);
const source = await readStereo(sourceWav);

// --- Stretch so the loop is whole frames --------------------------------------------------------
const loopFrames = Math.round((SOURCE_LOOP.end - SOURCE_LOOP.start) * LOOP_FPS);
const scale = loopFrames / LOOP_FPS / (SOURCE_LOOP.end - SOURCE_LOOP.start);

/** Lanczos (a = 8) resampling by `scale` (output length / input length). */
function resample(input: Float32Array): Float32Array {
  const a = 8;
  const output = new Float32Array(Math.floor(input.length * scale));
  const sinc = (x: number) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  for (let n = 0; n < output.length; n++) {
    const t = n / scale;
    const base = Math.floor(t);
    let sum = 0;
    for (let k = base - a + 1; k <= base + a; k++) {
      const d = t - k;
      sum += (input[k] ?? 0) * sinc(d) * sinc(d / a);
    }
    output[n] = sum;
  }
  return output;
}
const stretched = source.map(resample) as [Float32Array, Float32Array];

// Pad the start so the loop end falls on a frame; the loop start is then one too.
const endFrame = Math.ceil(SOURCE_LOOP.end * scale * LOOP_FPS);
const startFrame = endFrame - loopFrames;
const pad = Math.round((endFrame / LOOP_FPS - SOURCE_LOOP.end * scale) * SAMPLE_RATE);
const loopStart = startFrame * SAMPLES_PER_FRAME;
const loopEnd = endFrame * SAMPLES_PER_FRAME;
const tail = TAIL * SAMPLE_RATE;
const fade = Math.round(CROSSFADE * SAMPLE_RATE);
const total = loopEnd + tail;

const at = (channel: Float32Array, i: number) => (i >= pad ? (channel[i - pad] ?? 0) : 0);
const output = stretched.map((channel) => {
  const out = new Float32Array(total);
  for (let i = 0; i < loopEnd - fade; i++) out[i] = at(channel, i);
  // Equal-power crossfade from the run-up to the loop end into the run-up to the loop start.
  for (let k = 0; k < fade; k++) {
    const angle = (Math.PI / 2) * (k / fade);
    out[loopEnd - fade + k] =
      at(channel, loopEnd - fade + k) * Math.cos(angle) +
      at(channel, loopStart - fade + k) * Math.sin(angle);
  }
  // The loop's first second again, with a short fade so the file doesn't end on a click.
  const release = Math.round(0.02 * SAMPLE_RATE);
  for (let k = 0; k < tail; k++) {
    out[loopEnd + k] = at(channel, loopStart + k) * Math.min(1, (tail - 1 - k) / release);
  }
  return out;
}) as [Float32Array, Float32Array];

let peak = 0;
for (const channel of output) for (const s of channel) peak = Math.max(peak, Math.abs(s));
const gain = PEAK / peak;

// --- Encode -------------------------------------------------------------------------------------
const wav = new DataView(new ArrayBuffer(44 + total * 4));
const text = (offset: number, value: string) => {
  for (let i = 0; i < value.length; i++) wav.setUint8(offset + i, value.charCodeAt(i));
};
text(0, "RIFF");
wav.setUint32(4, 36 + total * 4, true);
text(8, "WAVE");
text(12, "fmt ");
wav.setUint32(16, 16, true);
wav.setUint16(20, 1, true); // PCM
wav.setUint16(22, 2, true); // stereo
wav.setUint32(24, SAMPLE_RATE, true);
wav.setUint32(28, SAMPLE_RATE * 4, true);
wav.setUint16(32, 4, true);
wav.setUint16(34, 16, true);
text(36, "data");
wav.setUint32(40, total * 4, true);
for (let i = 0; i < total; i++) {
  for (const [c, channel] of output.entries()) {
    const value = Math.round((channel[i] ?? 0) * gain * 0x7fff);
    wav.setInt16(44 + i * 4 + c * 2, Math.max(-0x8000, Math.min(0x7fff, value)), true);
  }
}
const prepared = join(workDir, "prepared.wav");
await Bun.write(prepared, wav.buffer);
const out = resolve(packageDir, "public", WORLD_TRACK.file);
await ffmpeg("-i", prepared, "-c:a", "aac", "-b:a", "160k", "-f", "mp4", out);

// --- Checks on the decoded file, as a browser would hear it -------------------------------------
const decodedWav = join(workDir, "decoded.wav");
await ffmpeg("-i", out, "-c:a", "pcm_s16le", "-f", "wav", decodedWav);
const [decoded] = await readStereo(decodedWav);
const [encoded] = await readStereo(prepared);
await rm(workDir, { recursive: true });

const db = (value: number) => 20 * Math.log10(Math.max(value, 1e-12));
const rms = (signal: Float32Array, from: number, to: number) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (signal[i] ?? 0) ** 2;
  return Math.sqrt(sum / (to - from));
};

// Encoder offset: the lag that best lines the decoded audio up with what was encoded.
let lag = 0;
let best = -Infinity;
const probe = loopStart + SAMPLE_RATE;
for (let d = -4096; d <= 4096; d++) {
  let score = 0;
  for (let i = probe; i < probe + 8192; i += 2) score += (encoded[i] ?? 0) * (decoded[i + d] ?? 0);
  if (score > best) {
    best = score;
    lag = d;
  }
}

/**
 * The seam as heard: the audio across the jump (loop end, then loop start) against the audio the
 * source plays at the same point without a jump (into the tail, which is the loop start again).
 */
const window = Math.round(0.05 * SAMPLE_RATE);
const seamLevels = {
  before: db(rms(decoded, loopEnd - window, loopEnd)),
  after: db(rms(decoded, loopStart, loopStart + window)),
};
const seamJump = Math.abs((decoded[loopStart] ?? 0) - (decoded[loopEnd - 1] ?? 0));
let neighbours = 0;
for (let i = loopEnd - window + 1; i < loopEnd; i++) {
  neighbours = Math.max(neighbours, Math.abs((decoded[i] ?? 0) - (decoded[i - 1] ?? 0)));
}
let decodedPeak = 0;
let clipped = 0;
for (const s of decoded) {
  decodedPeak = Math.max(decodedPeak, Math.abs(s));
  if (Math.abs(s) >= 1) clipped++;
}

const seconds = total / SAMPLE_RATE;
console.log(`Wrote ${out}`);
console.log(`Stretch ${((scale - 1) * 100).toFixed(4)} %, start padded by ${pad} samples`);
console.log(`Loop frames ${startFrame}-${endFrame} (${loopFrames}), file ${seconds}s`);
console.log(`Decoded ${(decoded.length / SAMPLE_RATE).toFixed(4)}s, encoder offset ${lag} samples`);
console.log(`Peak ${db(decodedPeak).toFixed(2)} dBFS, clipped samples ${clipped}`);
console.log(
  `Seam: last 50 ms ${seamLevels.before.toFixed(2)} dB, first 50 ms ${seamLevels.after.toFixed(2)} dB, ` +
    `jump ${seamJump.toFixed(5)} vs neighbours up to ${neighbours.toFixed(5)}`,
);

const failures = [
  (WORLD_TRACK.loop.startFrame !== startFrame || WORLD_TRACK.loop.endFrame !== endFrame) &&
    `WORLD_TRACK.loop should be { startFrame: ${startFrame}, endFrame: ${endFrame} }`,
  WORLD_TRACK.seconds !== seconds && `WORLD_TRACK.seconds should be ${seconds}`,
  lag !== 0 && `encoder offset is ${lag} samples`,
  db(decodedPeak) > -0.5 && "peak above -0.5 dBFS",
  clipped > 0 && "clipped samples",
  Math.abs(seamLevels.before - seamLevels.after) > 3 && "seam levels differ by more than 3 dB",
  seamJump > neighbours && "click at the seam",
  Math.abs(decoded.length / SAMPLE_RATE - seconds) > 0.05 && "decoded length is off",
].filter(Boolean);
if (failures.length > 0) {
  console.error(`Checks failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("All checks passed.");
