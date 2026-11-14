/**
 * Small, deterministic DSP for scripts/synth-sfx.ts: seeded noise, RBJ biquad filters, struck
 * (modal) objects, filtered noise bursts, a Freeverb-style room and a circular join for loops.
 * Everything works on whole Float32Array buffers at SAMPLE_RATE.
 */

export const SAMPLE_RATE = 44_100;

/** A seeded noise source in [-1, 1): the same sequence for the same seed, on every run. */
export function rng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 31 - 1;
  };
}

/** A stable seed from a name, so each sound draws its own noise. */
export function seedOf(name: string): number {
  let h = 0x811c9dc5;
  for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  return h | 0;
}

type BiquadKind = "lowpass" | "highpass" | "bandpass";

/** An RBJ biquad over a whole buffer (a new buffer is returned). */
export function biquad(x: Float32Array, kind: BiquadKind, hz: number, q = 0.707): Float32Array {
  const w = (2 * Math.PI * hz) / SAMPLE_RATE;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0: number;
  let b1: number;
  let b2: number;
  if (kind === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = b0;
  } else if (kind === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = b0;
  } else {
    b0 = alpha; // constant 0 dB peak gain
    b1 = 0;
    b2 = -alpha;
  }
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i] ?? 0;
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    y[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return y;
}

/** Mixes `src` into `out` at `gain`, starting at sample `at`. */
export function mix(out: Float32Array, src: Float32Array, gain = 1, at = 0): void {
  for (let i = 0; i < src.length && at + i < out.length; i++) {
    if (at + i >= 0) out[at + i] = (out[at + i] ?? 0) + (src[i] ?? 0) * gain;
  }
}

/**
 * A struck object: decaying sines (modes) starting at `at` seconds, with a 1 ms attack.
 * `decays` are in 1/s (larger dies faster).
 */
export function strike(
  out: Float32Array,
  at: number,
  modes: readonly { hz: number; decay: number; gain: number }[],
  amp = 1,
): void {
  const start = Math.round(at * SAMPLE_RATE);
  const attack = 0.001 * SAMPLE_RATE;
  for (const mode of modes) {
    const w = (2 * Math.PI * mode.hz) / SAMPLE_RATE;
    const k = Math.exp(-mode.decay / SAMPLE_RATE);
    let env = 1;
    for (let i = 0; start + i < out.length && env > 1e-4; i++) {
      out[start + i] =
        (out[start + i] ?? 0) + Math.sin(w * i) * env * Math.min(1, i / attack) * mode.gain * amp;
      env *= k;
    }
  }
}

/** A pitched thump: a sine whose frequency falls from `from` to `to` Hz. */
export function thump(
  out: Float32Array,
  at: number,
  { from, to, drop, decay, gain }: { from: number; to: number; drop: number; decay: number; gain: number },
): void {
  const start = Math.round(at * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; start + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-decay * t) * Math.min(1, i / (0.002 * SAMPLE_RATE));
    if (env < 1e-4) break;
    phase += (2 * Math.PI * (to + (from - to) * Math.exp(-drop * t))) / SAMPLE_RATE;
    out[start + i] = (out[start + i] ?? 0) + Math.sin(phase) * env * gain;
  }
}

/**
 * A burst of noise from `noise`, shaped by an attack and an exponential decay, then filtered by
 * `shape` (a function of the raw burst). Mixed into `out` at `at` seconds.
 */
export function burst(
  out: Float32Array,
  noise: () => number,
  at: number,
  { attack, decay, seconds, gain }: { attack: number; decay: number; seconds: number; gain: number },
  shape: (x: Float32Array) => Float32Array = (x) => x,
): void {
  const n = Math.round(seconds * SAMPLE_RATE);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    raw[i] = noise() * Math.min(1, t / Math.max(attack, 1e-4)) * Math.exp(-decay * t);
  }
  mix(out, shape(raw), gain, Math.round(at * SAMPLE_RATE));
}

/**
 * A small Freeverb-style room: eight damped combs into four allpasses. `size` 0..1 sets the
 * decay, `damp` 0..1 how fast highs die, `mix` the wet share. Deterministic, mono.
 */
export function room(
  x: Float32Array,
  { size, damp = 0.4, mix: wet }: { size: number; damp?: number; mix: number },
): Float32Array {
  const scale = SAMPLE_RATE / 44_100;
  const feedback = 0.7 + 0.28 * size;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({
    buf: new Float32Array(Math.round(d * scale * (0.6 + 0.4 * size))),
    i: 0,
    low: 0,
  }));
  const passes = [556, 441, 341, 225].map((d) => ({
    buf: new Float32Array(Math.round(d * scale)),
    i: 0,
  }));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    const input = (x[n] ?? 0) * 0.015;
    let sum = 0;
    for (const c of combs) {
      const out = c.buf[c.i] ?? 0;
      c.low = out * (1 - damp) + c.low * damp;
      c.buf[c.i] = input + c.low * feedback;
      c.i = (c.i + 1) % c.buf.length;
      sum += out;
    }
    for (const a of passes) {
      const b = a.buf[a.i] ?? 0;
      a.buf[a.i] = sum + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      sum = b - sum;
    }
    y[n] = (x[n] ?? 0) * (1 - wet) + sum * wet * 3;
  }
  return y;
}

/**
 * Makes the first `n` samples of `x` loop seamlessly: the `fade` samples after `n` are crossfaded
 * (equal power) into the start, so sample n-1 runs on into sample 0 as it ran into sample n.
 * `x` must hold at least n + fade samples.
 */
export function circular(x: Float32Array, n: number, fade: number): Float32Array {
  const y = x.slice(0, n);
  for (let k = 0; k < fade; k++) {
    const a = (Math.PI / 2) * (k / fade);
    y[k] = (x[n + k] ?? 0) * Math.cos(a) + (x[k] ?? 0) * Math.sin(a);
  }
  return y;
}
