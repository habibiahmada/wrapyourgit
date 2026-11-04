/**
 * Synthesises the placeholder soundtrack used to test beat sync (ADR-0007): an original,
 * deterministic track, so there is no licence question. Not the final music.
 *
 *   bun scripts/synth-placeholder-track.ts
 *
 * Writes packages/video/public/audio/placeholder-120bpm.wav (mono, 44.1 kHz, 16-bit).
 * Structure follows TRACK: pad + riser in the intro, kick/hat/bass from the drop, fade in the outro.
 */
import { TRACK } from "../packages/video/src/audio/track";

const SAMPLE_RATE = 44_100;
const beatSeconds = 60 / TRACK.bpm;
const totalSeconds = TRACK.beats * beatSeconds;
const samples = new Float32Array(Math.ceil(totalSeconds * SAMPLE_RATE));

// Seeded PRNG keeps the noise (hats, riser) identical on every run.
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

// A minor, F, C, G: one chord per bar (4 beats).
const roots = [55, 43.65, 65.41, 49];
const triad = (root: number) => [root * 4, root * 4 * 1.2, root * 4 * 1.5];

const { drop, outro } = TRACK.sections;
const kickEnvelope = (t: number) => Math.exp(-t * 18);

for (let beat = 0; beat < TRACK.beats; beat++) {
  const at = beat * beatSeconds;
  const bar = Math.floor(beat / 4);
  const root = roots[bar % roots.length] ?? 55;

  if (beat % 4 === 0) {
    for (const frequency of triad(root)) {
      add(
        at,
        beatSeconds * 4,
        (t) => 0.05 * Math.sin(2 * Math.PI * frequency * t) * Math.min(1, t * 4),
      );
    }
  }

  if (beat >= drop) {
    add(at, 0.35, (t) => {
      const phase = 2 * Math.PI * (45 * t + (65 / 9) * (1 - Math.exp(-t * 9)));
      return 0.9 * Math.sin(phase) * Math.exp(-t * 8);
    });
    add(at + beatSeconds / 2, 0.06, (t) => 0.18 * noise() * Math.exp(-t * 60));
    // Bass ducks under the kick so each beat reads clearly.
    add(at, beatSeconds, (t) => {
      const duck = 1 - 0.8 * kickEnvelope(t);
      return 0.22 * duck * Math.tanh(2 * Math.sin(2 * Math.PI * root * t));
    });
  }
}

// Riser over the last two bars of the intro, ending exactly on the drop.
const riserStart = (drop - 4) * beatSeconds;
add(riserStart, 4 * beatSeconds, (t) => {
  const progress = t / (4 * beatSeconds);
  return 0.25 * progress ** 2 * noise();
});

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

const path = `packages/video/public/${TRACK.file}`;
await Bun.write(path, data.buffer);
console.log(`Wrote ${path} (${totalSeconds}s, ${TRACK.bpm} BPM, drop at beat ${drop}).`);
