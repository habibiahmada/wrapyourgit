/**
 * Synthesises the story soundtrack (ADR-0007): an original, deterministic track, so there is no
 * licence or Content ID question. Every section boundary comes from TRACK, so the music and the
 * scene timeline can't drift apart.
 *
 *   bun scripts/synth-track.ts
 *
 * Writes packages/video/public/audio/wrapyourgit-120bpm.m4a (AAC, mono, 44.1 kHz) via the
 * FFmpeg that ships with Remotion; the intermediate WAV is not kept.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { $ } from "bun";
import { TRACK } from "../packages/video/src/audio/track";

const SAMPLE_RATE = 44_100;
const beatSeconds = 60 / TRACK.bpm;
const totalSeconds = TRACK.beats * beatSeconds;
const samples = new Float32Array(Math.ceil(totalSeconds * SAMPLE_RATE));
const { drop, climax, outro } = TRACK.sections;

// Seeded PRNG keeps the noise (hats, claps, risers) identical on every run.
let seed = 0x5eed;
const noise = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 31 - 1;
};

const add = (startSeconds: number, seconds: number, voice: (t: number) => number) => {
  const start = Math.round(startSeconds * SAMPLE_RATE);
  const length = Math.round(seconds * SAMPLE_RATE);
  for (let i = 0; i < length && start + i < samples.length; i++) {
    samples[start + i] = (samples[start + i] ?? 0) + voice(i / SAMPLE_RATE);
  }
};

const sine = (frequency: number, t: number) => Math.sin(2 * Math.PI * frequency * t);

// A minor, F, C, G: one chord per bar (4 beats). Roots in Hz.
const roots = [55, 43.65, 65.41, 49];
const triad = (root: number, octave = 4) => [
  root * octave,
  root * octave * 1.2,
  root * octave * 1.5,
];

const kick = (at: number, gain = 0.9) =>
  add(at, 0.35, (t) => {
    const phase = 2 * Math.PI * (45 * t + (65 / 9) * (1 - Math.exp(-t * 9)));
    return gain * Math.sin(phase) * Math.exp(-t * 8);
  });
const hat = (at: number, gain = 0.16) => add(at, 0.06, (t) => gain * noise() * Math.exp(-t * 60));
const clap = (at: number) =>
  add(
    at,
    0.18,
    (t) => 0.3 * noise() * (Math.exp(-t * 25) + 0.4 * Math.exp(-Math.abs(t - 0.012) * 300)),
  );
const riser = (startBeat: number, lengthBeats: number, gain = 0.28) =>
  add(startBeat * beatSeconds, lengthBeats * beatSeconds, (t) => {
    const progress = t / (lengthBeats * beatSeconds);
    return gain * progress ** 2 * (noise() * 0.7 + 0.3 * sine(200 + 1800 * progress, t));
  });

for (let beat = 0; beat < TRACK.beats; beat++) {
  const at = beat * beatSeconds;
  const bar = Math.floor(beat / 4);
  const root = roots[bar % roots.length] ?? 55;
  const inClimax = beat >= climax && beat < outro;
  const inOutro = beat >= outro;
  // Two beats of near-silence before the climax make the identity reveal land.
  const breath = beat >= climax - 2 && beat < climax;

  if (beat % 4 === 0) {
    for (const frequency of triad(root, inClimax ? 8 : 4)) {
      add(
        at,
        beatSeconds * 4,
        (t) => (inClimax ? 0.045 : 0.05) * sine(frequency, t) * Math.min(1, t * 4),
      );
    }
  }
  if (beat < drop || breath) continue;

  if (!inOutro || beat % 2 === 0) kick(at, inOutro ? 0.6 : 0.9);
  if (!inOutro) hat(at + beatSeconds / 2, inClimax ? 0.2 : 0.16);
  if (beat >= 24 && !inOutro && beat % 2 === 1) clap(at);
  // Bass ducks under the kick so each beat reads clearly.
  add(at, beatSeconds, (t) => {
    const duck = 1 - 0.8 * Math.exp(-t * 18);
    return (inOutro ? 0.14 : 0.22) * duck * Math.tanh(2 * sine(root, t));
  });
  // Arpeggio in sixteenths from the language scene on: the chord tones, plucked.
  if (beat >= 40 && !inOutro) {
    const notes = triad(root, inClimax ? 8 : 4);
    for (let step = 0; step < 4; step++) {
      const frequency = notes[(beat * 4 + step) % notes.length] ?? root;
      add(
        at + (step * beatSeconds) / 4,
        beatSeconds / 4,
        (t) => 0.06 * sine(frequency * 2, t) * Math.exp(-t * 14),
      );
    }
  }
}

riser(drop - 4, 4);
riser(climax - 8, 6, 0.32);
add(climax * beatSeconds, 2.5, (t) => 0.35 * noise() * Math.exp(-t * 2.2)); // crash on the reveal

// Fade out across the outro section; normalise to -1 dBFS.
const outroStart = outro * beatSeconds * SAMPLE_RATE;
let peak = 0;
for (let i = 0; i < samples.length; i++) {
  if (i > outroStart) {
    samples[i] =
      (samples[i] ?? 0) * Math.max(0, 1 - (i - outroStart) / (samples.length - outroStart));
  }
  peak = Math.max(peak, Math.abs(samples[i] ?? 0));
}
const gain = 0.89 / peak;

const data = new DataView(new ArrayBuffer(44 + samples.length * 2));
const writeString = (offset: number, text: string) => {
  for (let i = 0; i < text.length; i++) data.setUint8(offset + i, text.charCodeAt(i));
};
writeString(0, "RIFF");
data.setUint32(4, 36 + samples.length * 2, true);
writeString(8, "WAVE");
writeString(12, "fmt ");
data.setUint32(16, 16, true);
data.setUint16(20, 1, true); // PCM
data.setUint16(22, 1, true); // mono
data.setUint32(24, SAMPLE_RATE, true);
data.setUint32(28, SAMPLE_RATE * 2, true);
data.setUint16(32, 2, true);
data.setUint16(34, 16, true);
writeString(36, "data");
data.setUint32(40, samples.length * 2, true);
samples.forEach((sample, i) => {
  data.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample * gain)) * 0x7fff, true);
});

const workDir = await mkdtemp(join(tmpdir(), "wyg-track-"));
const wav = join(workDir, "track.wav");
await Bun.write(wav, data.buffer);
const out = resolve(import.meta.dir, "../packages/video/public", TRACK.file);
await $`bunx remotion ffmpeg -v error -y -i ${wav} -c:a aac -b:a 160k -f mp4 ${out}`
  .cwd("packages/video")
  .quiet();
await rm(workDir, { recursive: true });
console.log(`Wrote ${out} (${totalSeconds}s, ${TRACK.bpm} BPM, climax at beat ${climax}).`);
