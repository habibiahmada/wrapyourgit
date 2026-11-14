/**
 * Synthesises the story's sound effects (ADR-0009): original, deterministic, CC0. Pitched sounds
 * sit on A so they agree with the soundtrack. Lengths and names come from SFX, so the registry and
 * the files can't disagree.
 *
 *   bun scripts/synth-sfx.ts [outDir]
 *
 * Writes <outDir or packages/video/public>/audio/sfx/<name>.wav (16-bit mono, 44.1 kHz, peak
 * -3 dBFS). Each sound draws noise from its own seed, so changing one never changes another.
 *
 * Two kinds of voice: VOICES are per-sample functions (small chimes and clicks); DESIGNED build a
 * whole buffer from layers (struck modes, filtered noise bursts, thumps) and a small room, for the
 * sounds that need body: the steam, the firework and the objects.
 */

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SFX, type SfxName, sfxFile } from "../packages/video/src/audio/sfx";
import { biquad, burst, mix, rng, room, SAMPLE_RATE, seedOf, strike, thump } from "./lib/sfx-dsp";

const A5 = 880;

/** Noise for the voice being rendered; reseeded per sound in render(). */
let noise = rng(0);
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

type Designed = "chug" | "firework" | "flag" | "page" | "crate" | "seesaw";

/** Builds a voice per sound: a function of time in seconds, called once per sample in order. */
const VOICES: Record<Exclude<SfxName, Designed>, () => (t: number, length: number) => number> = {
  tap: () => (t) => (0.7 * sine(1200 * (1 - 0.4 * t * 16), t) + 0.3 * noise()) * Math.exp(-t * 90),
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
  rails: () => {
    // The wheels on the rails: at each of four joints the front and back axles clack, "da-dum".
    // Played as a loop (SFX.rails.loop), so the last clack has died away before the file ends
    // and the loop joins on silence. (A layered steel version was tried and sounded like a spoon
    // on a glass; this one stays.)
    const hits = [0, 0.42, 0.84, 1.26].flatMap((at) => [
      { at: at + 0.02, weight: 1 },
      { at: at + 0.135, weight: 0.8 },
    ]);
    const click = highPass(1400);
    return (t) => {
      let sum = 0;
      for (const hit of hits) {
        const local = t - hit.at;
        if (local < 0 || local > 0.14) continue;
        const ring = 0.5 * sine(A5 * 2, local) + 0.3 * sine(A5 * 2.7, local);
        const thump = 0.8 * sine(95, local);
        sum +=
          hit.weight *
          (click(noise(), t) * 0.9 + ring * Math.exp(-local * 70) + thump) *
          Math.min(1, local * 900) *
          Math.exp(-local * 45);
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

const at = (seconds: number) => Math.round(seconds * SAMPLE_RATE);
/** Raw noise of `n` samples from the current voice's seed. */
const noiseOf = (n: number) => Float32Array.from({ length: n }, () => noise());
/** Multiplies `x` by `env(t)` in place and returns it. */
const shaped = (x: Float32Array, env: (t: number) => number) => {
  for (let i = 0; i < x.length; i++) x[i] = (x[i] ?? 0) * env(i / SAMPLE_RATE);
  return x;
};

/**
 * Sounds built from layers over a whole buffer of `n` samples. The room is applied inside each, so
 * the reverb tail is part of the sound's length.
 */
const DESIGNED: Record<Designed, (n: number) => Float32Array> = {
  chug: (n) => {
    // Two puffs of steam: a breathy band of noise with a low push under it, then a hiss tail.
    const out = new Float32Array(n);
    [
      { t: 0.02, gain: 1 },
      { t: 0.4, gain: 0.8 },
    ].forEach(({ t, gain }) => {
      burst(out, noise, t, { attack: 0.012, decay: 9, seconds: 0.45, gain: 1.4 * gain }, (x) =>
        biquad(biquad(x, "bandpass", 520, 0.9), "lowpass", 2200),
      );
      burst(
        out,
        noise,
        t + 0.02,
        { attack: 0.03, decay: 12, seconds: 0.35, gain: 0.25 * gain },
        (x) => biquad(x, "bandpass", 2600, 1.2),
      );
      thump(out, t, { from: 90, to: 62, drop: 25, decay: 18, gain: 0.55 * gain });
    });
    return room(out, { size: 0.55, damp: 0.5, mix: 0.18 });
  },
  firework: (n) => {
    // The burst: a crack, a deep boom with a falling pitch, then crackling sparks that thin out,
    // all in a wide open-air room.
    const out = new Float32Array(n);
    burst(out, noise, 0.005, { attack: 0.0005, decay: 70, seconds: 0.08, gain: 0.6 }, (x) =>
      biquad(x, "highpass", 900),
    );
    thump(out, 0.005, { from: 95, to: 42, drop: 9, decay: 4.5, gain: 0.9 });
    burst(out, noise, 0.005, { attack: 0.002, decay: 6, seconds: 0.6, gain: 0.9 }, (x) =>
      biquad(biquad(x, "lowpass", 380), "lowpass", 380),
    );
    for (let i = 0; i < 70; i++) {
      // Sparks: more early, fewer late; each a tiny tick of band-passed noise.
      const u = (noise() + 1) / 2;
      const t = 0.1 + 0.95 * u ** 1.7;
      const hz = 2200 + ((noise() + 1) / 2) * 4200;
      const level = (0.12 + 0.22 * ((noise() + 1) / 2)) * (1 - 0.65 * ((t - 0.1) / 0.95));
      burst(out, noise, t, { attack: 0.0003, decay: 450, seconds: 0.012, gain: level * 2.2 }, (x) =>
        biquad(x, "bandpass", hz, 2.5),
      );
    }
    return room(out, { size: 0.85, damp: 0.35, mix: 0.3 });
  },
  flag: (n) => {
    // Cloth caught by the wind: three snaps of fabric, each softer, over a short gust.
    const out = new Float32Array(n);
    [
      { t: 0.015, gain: 1 },
      { t: 0.135, gain: 0.72 },
      { t: 0.235, gain: 0.5 },
    ].forEach(({ t, gain }) => {
      burst(out, noise, t, { attack: 0.003, decay: 32, seconds: 0.16, gain: 1.6 * gain }, (x) =>
        biquad(biquad(x, "bandpass", 1500, 0.7), "lowpass", 5200),
      );
      thump(out, t, { from: 110, to: 80, drop: 30, decay: 40, gain: 0.18 * gain });
    });
    const gust = biquad(biquad(noiseOf(n), "lowpass", 650), "highpass", 120);
    mix(
      out,
      shaped(gust, (t) => Math.sin(Math.PI * Math.min(1, t / (n / SAMPLE_RATE))) ** 2),
      0.5,
    );
    return room(out, { size: 0.3, damp: 0.5, mix: 0.1 });
  },
  page: (n) => {
    // A page turned: the paper's swish rising and falling, a little crinkle, then it settles.
    const out = new Float32Array(n);
    const swish = biquad(biquad(noiseOf(n), "bandpass", 3600, 0.6), "highpass", 1200);
    const length = 0.34;
    mix(
      out,
      shaped(swish, (t) => (t < length ? Math.sin(Math.PI * (t / length)) ** 2 : 0)),
      1.1,
    );
    for (let i = 0; i < 14; i++) {
      const t = 0.05 + 0.25 * ((noise() + 1) / 2);
      burst(out, noise, t, { attack: 0.0002, decay: 900, seconds: 0.006, gain: 0.28 }, (x) =>
        biquad(x, "highpass", 3000),
      );
    }
    burst(out, noise, 0.33, { attack: 0.004, decay: 35, seconds: 0.12, gain: 0.5 }, (x) =>
      biquad(x, "lowpass", 900),
    );
    return room(out, { size: 0.25, damp: 0.55, mix: 0.08 });
  },
  crate: (n) => {
    // A knock on a hollow wooden box: wood modes, the box's air resonating, a click of contact,
    // and a smaller second knock as the lid settles.
    const out = new Float32Array(n);
    const wood = [
      { hz: 205, decay: 24, gain: 0.55 },
      { hz: 530, decay: 36, gain: 0.32 },
      { hz: 850, decay: 52, gain: 0.18 },
      { hz: 1210, decay: 75, gain: 0.1 },
    ];
    strike(out, 0.005, wood);
    thump(out, 0.005, { from: 170, to: 135, drop: 40, decay: 16, gain: 0.35 });
    burst(out, noise, 0.005, { attack: 0.0003, decay: 220, seconds: 0.03, gain: 0.4 }, (x) =>
      biquad(x, "bandpass", 2100, 0.9),
    );
    strike(out, 0.115, wood, 0.42);
    return room(out, { size: 0.3, damp: 0.55, mix: 0.12 });
  },
  seesaw: (n) => {
    // A wooden board creaking as it tips: stick-slip pulses whose rate rises and falls, rung
    // through the board's resonances, then a soft bump as it lands.
    const out = new Float32Array(n);
    const pulses = new Float32Array(n);
    const creak = 0.62;
    let phase = 0;
    for (let i = 0; i < at(creak); i++) {
      const t = i / SAMPLE_RATE;
      const rate = 38 + 55 * Math.sin(Math.PI * (t / creak)) + 6 * noise();
      phase += rate / SAMPLE_RATE;
      if (phase >= 1) {
        phase -= 1;
        pulses[i] = 0.6 + 0.4 * ((noise() + 1) / 2);
      }
    }
    const env = (t: number) => (t < creak ? Math.sin(Math.PI * (t / creak)) ** 1.5 : 0);
    const body = new Float32Array(n);
    mix(body, biquad(pulses, "bandpass", 430, 9), 1);
    mix(body, biquad(pulses, "bandpass", 960, 7), 0.7);
    mix(body, biquad(pulses, "bandpass", 1720, 6), 0.4);
    mix(out, shaped(biquad(body, "lowpass", 4200), env), 6);
    thump(out, creak + 0.02, { from: 120, to: 85, drop: 30, decay: 22, gain: 0.45 });
    strike(out, creak + 0.02, [
      { hz: 240, decay: 30, gain: 0.2 },
      { hz: 610, decay: 45, gain: 0.1 },
    ]);
    return room(out, { size: 0.35, damp: 0.55, mix: 0.12 });
  },
};

const isDesigned = (name: SfxName): name is Designed => name in DESIGNED;

const publicDir = resolve(Bun.argv[2] ?? resolve(import.meta.dir, "../packages/video/public"));
await mkdir(join(publicDir, "audio/sfx"), { recursive: true });

async function render(name: SfxName) {
  const { seconds } = SFX[name];
  const file = sfxFile(name);
  noise = rng(seedOf(name));
  const n = Math.round(seconds * SAMPLE_RATE);
  let samples: Float32Array;
  if (isDesigned(name)) {
    samples = DESIGNED[name](n);
  } else {
    const voice = VOICES[name]();
    samples = new Float32Array(n);
    for (let i = 0; i < n; i++) samples[i] = voice(i / SAMPLE_RATE, seconds);
  }
  // A 2 ms fade at both ends so no effect starts or stops with a click (the rails loop joins on
  // silence), and a designed sound fades its last 15 % so a reverb tail never stops short.
  const edge = 0.002 * SAMPLE_RATE;
  const tail = isDesigned(name) ? Math.round(n * 0.15) : 0;
  for (let i = 0; i < n; i++) {
    const fromEnd = n - 1 - i;
    let w = Math.min(1, i / edge, fromEnd / edge);
    if (tail > 0 && fromEnd < tail) w *= 0.5 - 0.5 * Math.cos((Math.PI * fromEnd) / tail);
    samples[i] = (samples[i] ?? 0) * w;
  }
  await Bun.write(join(publicDir, file), wav(samples));
  console.log(`Wrote ${file} (${seconds}s)`);
}

for (const name of Object.keys(SFX) as SfxName[]) await render(name);
