/**
 * Synthesises the story's sound effects (ADR-0009): original, deterministic, CC0. Pitched sounds
 * sit on A so they agree with the soundtrack (A minor). Lengths and names come from SFX, so the
 * registry and the files can't disagree.
 *
 *   bun scripts/synth-sfx.ts
 *
 * Writes packages/video/public/audio/sfx/<name>.wav (16-bit mono, 44.1 kHz, peak -3 dBFS).
 */

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BLIP_STEPS, SFX, type SfxName, sfxFile } from "../packages/video/src/audio/sfx";

const SAMPLE_RATE = 44_100;
const A5 = 880;

// Seeded PRNG: the same noise on every run.
let seed = 0x5f3;
const noise = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 31 - 1;
};
const sine = (frequency: number, t: number) => Math.sin(2 * Math.PI * frequency * t);

/** One-pole low-pass, for noise that should sound like air rather than hiss. */
function lowPass(cutoff: (t: number) => number) {
  let previous = 0;
  return (input: number, t: number) => {
    const rc = 1 / (2 * Math.PI * cutoff(t));
    const alpha = 1 / SAMPLE_RATE / (rc + 1 / SAMPLE_RATE);
    previous += alpha * (input - previous);
    return previous;
  };
}

/** Builds a voice per sound: a function of time in seconds, called once per sample in order. */
const VOICES: Record<SfxName, (step: number) => (t: number, length: number) => number> = {
  whoosh: () => {
    const filter = lowPass((t) => 300 + 5000 * Math.sin(Math.PI * Math.min(1, t / 0.45)));
    return (t, length) => filter(noise(), t) * Math.sin(Math.PI * (t / length)) ** 1.5 * 2.2;
  },
  cells: () => {
    // A quick patter of tiny clicks, like cells landing one after another.
    const hits = Array.from({ length: 12 }, (_, i) => ({
      at: i * 0.024 + Math.abs(noise()) * 0.01,
      pitch: A5 * (1 + Math.abs(noise())),
    }));
    return (t) => {
      let sum = 0;
      for (const hit of hits) {
        const local = t - hit.at;
        if (local >= 0 && local < 0.04) sum += sine(hit.pitch, local) * Math.exp(-local * 140);
      }
      return sum * 0.6;
    };
  },
  pop: () => (t) => {
    // Pitch drops a little as it lands, which reads as "pop" rather than "beep".
    const frequency = A5 * (1 + 0.6 * Math.exp(-t * 60));
    return sine(frequency, t) * Math.exp(-t * 32);
  },
  tick: () => (t) => (0.6 * sine(A5 * 4, t) + 0.4 * noise()) * Math.exp(-t * 220),
  land: () => {
    const filter = lowPass(() => 1800);
    return (t) => {
      const thump =
        Math.sin(2 * Math.PI * (55 * t + 6 * (1 - Math.exp(-t * 30)))) * Math.exp(-t * 14);
      return thump + 0.35 * filter(noise(), t) * Math.exp(-t * 30);
    };
  },
  blip: (step) => {
    const frequency = A5 * (BLIP_STEPS[step] ?? 1);
    return (t) => (0.8 * sine(frequency, t) + 0.2 * sine(frequency * 2, t)) * Math.exp(-t * 28);
  },
  shimmer: () => (t, length) => {
    // Bell partials of an A major-ish arpeggio rising across the sweep.
    const partials = [1, 1.25, 1.5, 2, 2.5, 3];
    let sum = 0;
    partials.forEach((ratio, i) => {
      const start = (i / partials.length) * length * 0.6;
      const local = t - start;
      if (local >= 0) sum += sine(A5 * ratio, local) * Math.exp(-local * 4) * 0.3;
    });
    return sum * Math.min(1, (length - t) * 8);
  },
  impact: () => {
    const filter = lowPass((t) => 4000 * Math.exp(-t * 3) + 200);
    return (t) => {
      const sub = Math.sin(2 * Math.PI * (40 * t + 25 * (1 - Math.exp(-t * 8)))) * Math.exp(-t * 3);
      return sub + 0.5 * filter(noise(), t) * Math.exp(-t * 2.5);
    };
  },
};

function wav(samples: Float32Array): ArrayBuffer {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = 0.708 / (peak || 1); // -3 dBFS
  const data = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) data.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  data.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true); // PCM
  data.setUint16(22, 1, true); // mono
  data.setUint32(24, SAMPLE_RATE, true);
  data.setUint32(28, SAMPLE_RATE * 2, true);
  data.setUint16(32, 2, true);
  data.setUint16(34, 16, true);
  text(36, "data");
  data.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    data.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample * gain)) * 0x7fff, true);
  });
  return data.buffer;
}

const publicDir = resolve(import.meta.dir, "../packages/video/public");
await mkdir(join(publicDir, "audio/sfx"), { recursive: true });

async function render(name: SfxName, step: number) {
  const { seconds } = SFX[name];
  const file = sfxFile(name, step);
  const voice = VOICES[name](step);
  const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  // A 2 ms fade at both ends so no effect starts or stops with a click.
  const edge = 0.002 * SAMPLE_RATE;
  for (let i = 0; i < samples.length; i++) {
    const fade = Math.min(1, i / edge, (samples.length - 1 - i) / edge);
    samples[i] = voice(i / SAMPLE_RATE, seconds) * fade;
  }
  await Bun.write(join(publicDir, file), wav(samples));
  console.log(`Wrote ${file} (${seconds}s)`);
}

for (const name of Object.keys(SFX) as SfxName[]) {
  if (name === "blip") {
    for (let step = 0; step < BLIP_STEPS.length; step++) await render(name, step);
  } else {
    await render(name, 0);
  }
}
