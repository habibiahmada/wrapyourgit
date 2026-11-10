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

/** One-pole high-pass; with a low-pass it makes a band, for rustle and hiss. */
function highPass(cutoff: number) {
  const low = lowPass(() => cutoff);
  return (input: number, t: number) => input - low(input, t);
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
  tap: () => (t) => (0.7 * sine(1200 * (1 - 0.4 * t * 16), t) + 0.3 * noise()) * Math.exp(-t * 90),
  wind: () => {
    const filter = lowPass((t) => 350 + 500 * Math.sin(Math.PI * Math.min(1, t / 1.6)));
    return (t, length) => filter(noise(), t) * Math.sin(Math.PI * (t / length)) ** 2 * 3;
  },
  leaves: () => {
    // Rustle bursts at fixed offsets: band-passed noise, each with a quick attack and fall.
    const band = lowPass(() => 5500);
    const highs = highPass(1800);
    const bursts = Array.from({ length: 9 }, (_, i) => ({
      at: i * 0.14 + Math.abs(noise()) * 0.06,
      length: 0.08 + Math.abs(noise()) * 0.08,
    }));
    return (t, length) => {
      let envelope = 0;
      for (const burst of bursts) {
        const local = t - burst.at;
        if (local >= 0 && local < burst.length) {
          envelope = Math.max(envelope, Math.sin(Math.PI * (local / burst.length)));
        }
      }
      return band(highs(noise(), t), t) * envelope * Math.sin(Math.PI * (t / length)) ** 0.5 * 2;
    };
  },
  crickets: () => {
    // Pairs of short chirps near 4.5 kHz, with a slow wobble so the pairs don't line up.
    const pairs = Array.from({ length: 6 }, (_, i) => 0.1 + i * 0.26 + Math.abs(noise()) * 0.05);
    return (t, length) => {
      let sum = 0;
      for (const start of pairs) {
        for (const offset of [0, 0.06]) {
          const local = t - start - offset;
          if (local >= 0 && local < 0.03) {
            sum +=
              sine(4500 + 120 * Math.sin(local * 400), local) *
              Math.sin(Math.PI * (local / 0.03) ** 2);
          }
        }
      }
      return sum * Math.min(1, t * 10, (length - t) * 6);
    };
  },
  dive: () => {
    const filter = lowPass((t) => 2200 * Math.exp(-t * 2.4) + 180);
    return (t, length) => filter(noise(), t) * Math.sin(Math.PI * (t / length)) ** 0.8 * 2.4;
  },
  sprout: () => (t) => {
    // A soft pluck whose pitch climbs a fifth as it grows.
    const frequency = A5 * 0.5 * (1 + 0.5 * (1 - Math.exp(-t * 14)));
    return (
      (sine(frequency, t) + 0.3 * sine(frequency * 2, t)) * Math.min(1, t * 200) * Math.exp(-t * 13)
    );
  },
  lock: () => {
    // Two metallic clicks: inharmonic partials with a very short ring.
    return (t) => {
      let sum = 0;
      for (const at of [0.02, 0.17]) {
        const local = t - at;
        if (local < 0) continue;
        const ring = sine(2300, local) + 0.6 * sine(3470, local) + 0.4 * sine(5130, local);
        sum += (ring + 0.5 * noise()) * Math.exp(-local * 85);
      }
      return sum;
    };
  },
  flag: () => {
    // Cloth flap: band-limited noise gated by a fast flutter that slows as it dies.
    const band = highPass(500);
    const smooth = lowPass(() => 3500);
    return (t, length) => {
      const flutter = 0.55 + 0.45 * Math.sin(2 * Math.PI * (22 - 10 * (t / length)) * t);
      const envelope = Math.min(1, t * 60) * Math.exp(-t * 6);
      return smooth(band(noise(), t), t) * flutter * envelope * 2.5;
    };
  },
  chug: () => {
    // Two soft train chugs: low-passed noise puffs over a low thud.
    const air = lowPass(() => 900);
    return (t) => {
      let sum = 0;
      for (const at of [0.04, 0.42]) {
        const local = t - at;
        if (local < 0) continue;
        sum +=
          (air(noise(), t) * 1.6 + 0.6 * sine(70, local)) *
          Math.min(1, local * 120) *
          Math.exp(-local * 11);
      }
      return sum;
    };
  },
  bloom: () => (t, length) => {
    // Airy chime: soft sines stepping up A minor pentatonic, each with a slow tail, plus breath.
    const air = highPass(3000);
    let sum = 0;
    [1, 1.189, 1.498].forEach((ratio, i) => {
      const local = t - i * 0.09;
      if (local >= 0)
        sum +=
          sine(A5 * 0.75 * ratio, local) * Math.min(1, local * 150) * Math.exp(-local * 17) * 0.5;
    });
    return sum + air(noise(), t) * 0.05 * Math.sin(Math.PI * (t / length));
  },
  crate: () => (t) => {
    // A wooden knock: a short, damped hollow tone with a click of noise.
    const frequency = 190 * (1 + 0.25 * Math.exp(-t * 60));
    return (
      (sine(frequency, t) + 0.5 * sine(frequency * 2.4, t) + 0.3 * noise() * Math.exp(-t * 200)) *
      Math.exp(-t * 28)
    );
  },
  twinkle: () => (t) => {
    // Bell partials at high pitches, struck at staggered times so it sparkles.
    let sum = 0;
    [0, 0.07, 0.15, 0.26].forEach((at, i) => {
      const local = t - at;
      if (local < 0) return;
      const base = A5 * 2 * ([1, 1.335, 1.498, 2][i] ?? 1);
      sum += (sine(base, local) + 0.35 * sine(base * 2.76, local)) * Math.exp(-local * 7) * 0.4;
    });
    return sum;
  },
  landing: () => {
    // A soft swoosh that closes down, then a tap as it touches ground.
    const filter = lowPass((t) => 1800 * Math.exp(-t * 7) + 250);
    return (t) => {
      const swoosh =
        filter(noise(), t) * Math.sin(Math.PI * Math.min(1, t / 0.3)) ** 2 * Math.exp(-t * 4);
      const local = t - 0.3;
      const tap = local >= 0 ? sine(160 * (1 - 0.3 * local * 8), local) * Math.exp(-local * 30) : 0;
      return swoosh * 1.4 + tap * 0.8;
    };
  },
  spotlight: () => (t, length) => {
    // A low warm thump, then a shimmer of bell partials that fades in over it.
    const thump = sine(62 + 30 * Math.exp(-t * 25), t) * Math.exp(-t * 9);
    let shimmer = 0;
    [1, 1.5, 2, 3].forEach((ratio, i) => {
      const local = t - 0.08 - i * 0.04;
      if (local >= 0) shimmer += sine(A5 * ratio * 0.5, local) * Math.exp(-local * 4) * 0.14;
    });
    return thump + shimmer * Math.min(1, (length - t) * 6);
  },
  seesaw: () => {
    // A wooden creak: a sawtooth-ish tone gliding one way and back, softened by a low-pass.
    const soft = lowPass(() => 1200);
    let phase = 0;
    return (t, length) => {
      const frequency = 210 + 90 * Math.sin(Math.PI * (t / length)) ** 2 + 8 * sine(31, t);
      phase = (phase + frequency / SAMPLE_RATE) % 1;
      const saw = 2 * phase - 1;
      return (
        soft(saw + 0.3 * noise(), t) *
        Math.sin(Math.PI * (t / length)) ** 4 *
        (0.2 + 0.8 * Math.abs(sine(7, t)))
      );
    };
  },
  page: () => {
    // A paper swish: high band of noise that rises and falls once.
    const band = highPass(1500);
    const smooth = lowPass((t) => 3000 + 3000 * Math.sin(Math.PI * Math.min(1, t / 0.3)));
    return (t, length) => smooth(band(noise(), t), t) * Math.sin(Math.PI * (t / length)) ** 3 * 3;
  },
  firework: () => {
    // A pop, then a crackle tail of random sparse ticks.
    const filter = lowPass(() => 2500);
    const ticks = Array.from({ length: 36 }, () => ({
      at: 0.08 + Math.abs(noise()) * 1.05,
      pitch: 2500 + Math.abs(noise()) * 3000,
      gain: 0.15 + Math.abs(noise()) * 0.2,
    }));
    return (t) => {
      let sum =
        (sine(150 * (1 + 2 * Math.exp(-t * 50)), t) + 0.6 * filter(noise(), t)) * Math.exp(-t * 24);
      for (const tick of ticks) {
        const local = t - tick.at;
        if (local >= 0 && local < 0.02) {
          sum +=
            sine(tick.pitch, local) *
            Math.exp(-local * 200) *
            tick.gain *
            (1 - (tick.at / 1.2) * 0.8);
        }
      }
      return sum;
    };
  },
  hello: () => (t) => {
    // A friendly two-note chime: A5 then the E above it.
    let sum = 0;
    [0, 0.14].forEach((at, i) => {
      const local = t - at;
      if (local < 0) return;
      const frequency = A5 * (i === 0 ? 1 : 1.498);
      sum +=
        (sine(frequency, local) + 0.25 * sine(frequency * 2, local)) *
        Math.min(1, local * 300) *
        Math.exp(-local * 24);
    });
    return sum;
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
