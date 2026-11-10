/**
 * Synthesises the story world's soundtrack (ADR-0007): original, deterministic, CC0. Calm and warm
 * in A minor (the key of the effects), made to rest on at a stop for minutes.
 *
 *   bun scripts/synth-world-track.ts
 *
 * Writes packages/video/public/audio/world-90bpm-v1.m4a (AAC, mono, 44.1 kHz) via the FFmpeg that
 * ships with Remotion, then decodes it back and checks the peak, the loop seam and the encoder
 * offset; it exits non-zero if any check fails. The intermediate WAV is not kept.
 *
 * Arrangement (one chord per two bars, Am7 Fmaj7 Cmaj7 G6, so a cycle is 8 bars):
 * - Intro, beats 0-32: pads, then a sparse pluck and the bass; no drums.
 * - Loop, beats 32-160: four cycles at one level: pads, bass, soft kick, brushes and a shaker,
 *   and a plucked arpeggio whose pattern changes every cycle so the loop isn't a 4-bar repeat.
 * - Outro, beats 160-192: drums leave, the pluck thins out, the last Am rings and fades.
 *
 * The seam: the loop region is rendered circular (a tail ringing past the loop end is also mixed
 * into the loop start), so Web Audio's loopStart/loopEnd repeat it without a click. The intro's
 * last bar plays exactly what the loop's last bar plays, minus drums, so the intro's tails can be
 * cut at the loop start: the wrapped tails continue them sample for sample.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { $ } from "bun";
import { WORLD_TRACK } from "../packages/video/src/audio/world-track";

const SAMPLE_RATE = 44_100;
const beatSeconds = 60 / WORLD_TRACK.bpm;
const beatSamples = Math.round(beatSeconds * SAMPLE_RATE);
const total = WORLD_TRACK.beats * beatSamples;
const loopStart = WORLD_TRACK.loop.startBeat * beatSamples;
const loopEnd = WORLD_TRACK.loop.endBeat * beatSamples;
const loopLength = loopEnd - loopStart;
const OUTRO = WORLD_TRACK.loop.endBeat;
const DRUMS_OUT = OUTRO + 8;
const SHAKER_OUT = OUTRO + 16;
const FADE_FROM = OUTRO + 8;

const samples = new Float64Array(total);
// Bookkeeping for the seam check: intro tails we cut, and the tonal tails we wrapped in their place.
const cutIntro = new Float64Array(loopLength);
const wrappedTonal = new Float64Array(loopLength);

// Seeded PRNG keeps the drum noise identical on every run.
let seed = 0x90b9;
const noise = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 31 - 1;
};

type Voice = (t: number) => number;

/** Mixes `voice` in at `beat` for `seconds`, keeping the loop region circular (see the header). */
const add = (beat: number, seconds: number, voice: Voice, drum = false) => {
  const start = Math.round(beat * beatSamples);
  const length = Math.round(seconds * SAMPLE_RATE);
  const inLoop = start >= loopStart && start < loopEnd;
  for (let i = 0; i < length; i++) {
    const at = start + i;
    // Voices may keep state (filtered noise), so every sample is computed even when dropped.
    const value = voice(i / SAMPLE_RATE);
    if (at >= total) break;
    if (start < loopStart && at >= loopStart) {
      if (at < loopEnd) cutIntro[at - loopStart] = (cutIntro[at - loopStart] ?? 0) + value;
      continue;
    }
    if (inLoop && at >= loopEnd) {
      const wrapped = at - loopLength;
      samples[wrapped] = (samples[wrapped] ?? 0) + value;
      if (!drum)
        wrappedTonal[wrapped - loopStart] = (wrappedTonal[wrapped - loopStart] ?? 0) + value;
    }
    samples[at] = (samples[at] ?? 0) + value;
  }
};

const TAU = 2 * Math.PI;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** Raised-cosine attack and release: every note starts and ends at zero, so nothing clicks. */
const envelope = (t: number, attack: number, hold: number, release: number) => {
  if (t < attack) return 0.5 - 0.5 * Math.cos((Math.PI * t) / attack);
  if (t < hold) return 1;
  if (t < hold + release) return 0.5 + 0.5 * Math.cos((Math.PI * (t - hold)) / release);
  return 0;
};

type Chord = { pad: number[]; tones: number[]; bass: number };
// MIDI notes. `tones` are the arpeggio's seven steps, low to high.
const AM: Chord = { pad: [57, 60, 64, 67], tones: [57, 60, 64, 67, 69, 72, 76], bass: 33 };
const F: Chord = { pad: [53, 57, 60, 64], tones: [53, 57, 60, 64, 65, 69, 72], bass: 29 };
const C: Chord = { pad: [55, 59, 60, 64], tones: [55, 60, 64, 67, 71, 72, 76], bass: 36 };
const G: Chord = { pad: [55, 59, 62, 64], tones: [55, 59, 62, 64, 67, 71, 74], bass: 31 };
const PROGRESSION = [AM, F, C, G];
const OUTRO_CHORDS = [AM, F, C, AM];

const chordAt = (bar: number): Chord => {
  const progression = bar >= OUTRO / 4 ? OUTRO_CHORDS : PROGRESSION;
  const index = bar >= OUTRO / 4 ? Math.floor((bar - OUTRO / 4) / 2) : Math.floor(bar / 2) % 4;
  return progression[index] ?? AM;
};

// Warm pad: two slightly detuned voices with a soft second and third harmonic, slow swell.
const pad = (beat: number, midi: number, bars: number) => {
  const f = hz(midi);
  const hold = bars * 4 * beatSeconds;
  const release = 1.6;
  add(beat, hold + release, (t) => {
    let v = 0;
    for (const detune of [0.9985, 1.0015]) {
      const phase = TAU * f * detune * t;
      v += Math.sin(phase) + 0.22 * Math.sin(2 * phase) + 0.07 * Math.sin(3 * phase);
    }
    const breathe = 1 + 0.12 * Math.sin(TAU * 0.18 * t);
    return 0.06 * v * breathe * envelope(t, 0.9, hold, release);
  });
};

// Pluck: harmonics that die faster the higher they are, like a soft guitar or kalimba.
const PLUCK_SECONDS = 1.2;
const pluck = (beat: number, midi: number, gain = 0.055) => {
  const f = hz(midi);
  add(beat, PLUCK_SECONDS, (t) => {
    let v = 0;
    const weights = [1, 0.45, 0.2, 0.08];
    for (let h = 0; h < weights.length; h++) {
      v += (weights[h] ?? 0) * Math.sin(TAU * f * (h + 1) * t) * Math.exp(-t * (2 + 5 * h));
    }
    return gain * v * envelope(t, 0.004, PLUCK_SECONDS - 0.08, 0.08);
  });
};

const bassNote = (beat: number, midi: number, lengthBeats: number) => {
  const f = hz(midi);
  const seconds = lengthBeats * beatSeconds;
  add(beat, seconds, (t) => {
    const phase = TAU * f * t;
    const v = Math.sin(phase) + 0.3 * Math.sin(2 * phase);
    return 0.12 * v * Math.exp(-t * 0.6) * envelope(t, 0.012, seconds - 0.12, 0.12);
  });
};

const kick = (beat: number, gain = 0.14) =>
  add(
    beat,
    0.45,
    (t) => {
      const phase = TAU * (48 * t + (42 / 14) * (1 - Math.exp(-t * 14)));
      return gain * Math.sin(phase) * Math.exp(-t * 9) * envelope(t, 0.002, 0.4, 0.05);
    },
    true,
  );

// Brush: low-passed noise with a slow-ish attack, a swish rather than a crack.
const brush = (beat: number, gain = 0.1) => {
  let low = 0;
  add(
    beat,
    0.32,
    (t) => {
      low += 0.25 * (noise() - low);
      return gain * low * Math.exp(-t * 11) * envelope(t, 0.018, 0.27, 0.05);
    },
    true,
  );
};

// Shaker: the high part of the noise, very short.
const shaker = (beat: number, gain: number) => {
  let low = 0;
  add(
    beat,
    0.09,
    (t) => {
      const n = noise();
      low += 0.35 * (n - low);
      return gain * (n - low) * Math.exp(-t * 35) * envelope(t, 0.004, 0.07, 0.02);
    },
    true,
  );
};

// Arpeggio patterns, one eighth per step over a chord's two bars; -1 rests. One per loop cycle.
const PATTERNS = [
  [0, 2, 4, 3, 5, 4, 2, 3, 0, 2, 4, 3, 6, 5, 4, 2], // flowing up and down
  [0, 3, 1, 4, 2, 5, 3, 4, 1, 4, 2, 5, 3, 6, 4, 2], // broken thirds
  [0, -1, -1, 4, -1, -1, 5, -1, 2, -1, -1, 4, -1, 3, -1, -1], // sparse, dotted: a breath
  [6, 4, 5, 3, 4, 2, 3, 1, 5, 3, 4, 2, 3, 1, 2, 4], // falling from the top
];
const SPARSE = [0, -1, -1, -1, 4, -1, -1, -1, 2, -1, -1, -1, 5, -1, -1, -1];
const LAST_PATTERN = PATTERNS[3] ?? SPARSE;

const patternFor = (bar: number, stepInChord: number): number[] => {
  const loopBar = WORLD_TRACK.loop.startBeat / 4;
  const outroBar = OUTRO / 4;
  if (bar >= outroBar) return bar < outroBar + 4 ? (PATTERNS[0] ?? SPARSE) : SPARSE;
  if (bar >= loopBar) return PATTERNS[Math.floor((bar - loopBar) / 8) % 4] ?? SPARSE;
  // The intro's last bar plays the loop's last bar, so the loop start continues it seamlessly.
  if (bar === loopBar - 1 && stepInChord >= 8) return LAST_PATTERN;
  return SPARSE;
};

const bars = WORLD_TRACK.beats / 4;
for (let bar = 0; bar < bars; bar++) {
  const beat = bar * 4;
  const chord = chordAt(bar);
  const firstOfChord = bar % 2 === 0;

  if (firstOfChord) {
    for (const midi of chord.pad) pad(beat, midi, 2);
  }

  // Arpeggio from bar 2; stops a bar before the end so the last chord rings alone.
  if (bar >= 2 && bar < bars - 1) {
    for (let step = 0; step < 8; step++) {
      const stepInChord = (firstOfChord ? 0 : 8) + step;
      const index = patternFor(bar, stepInChord)[stepInChord] ?? -1;
      const midi = chord.tones[index];
      if (index >= 0 && midi !== undefined) pluck(beat + step / 2, midi);
    }
  }

  // Bass from bar 4: root on the one, root or fifth pushed onto the and-of-two.
  if (bar >= 4 && bar < bars - 2) {
    bassNote(beat, chord.bass, 2.5);
    bassNote(beat + 2.5, chord.bass + (firstOfChord ? 0 : 7), 1.5);
  } else if (bar === bars - 2) {
    bassNote(beat, chord.bass, 8);
  }

  // Drums only from the loop on; they leave early in the outro.
  if (beat < WORLD_TRACK.loop.startBeat) continue;
  if (beat < DRUMS_OUT) {
    kick(beat);
    kick(beat + 2.5, 0.1);
    brush(beat + 1);
    brush(beat + 3);
  }
  if (beat < SHAKER_OUT) {
    for (let step = 0; step < 8; step++) {
      // A light swing on the off-beats keeps the walk relaxed.
      const offBeat = step % 2 === 1;
      shaker(beat + Math.floor(step / 2) + (offBeat ? 0.56 : 0), offBeat ? 0.05 : 0.03);
    }
  }
}

// The outro fades to silence over its last 24 beats.
const fadeFrom = FADE_FROM * beatSamples;
for (let i = fadeFrom; i < total; i++) {
  const progress = (i - fadeFrom) / (total - fadeFrom);
  samples[i] = (samples[i] ?? 0) * (0.5 + 0.5 * Math.cos(Math.PI * progress));
}

let rawPeak = 0;
for (const sample of samples) rawPeak = Math.max(rawPeak, Math.abs(sample));
// Headroom under -1 dBFS for the AAC encoder's overshoot.
const CEILING = 10 ** (-1.6 / 20);
const scale = CEILING / rawPeak;

const pcm = new Int16Array(total);
for (let i = 0; i < total; i++) {
  pcm[i] = Math.round(Math.max(-1, Math.min(1, (samples[i] ?? 0) * scale)) * 0x7fff);
}

const data = new DataView(new ArrayBuffer(44 + total * 2));
const writeString = (offset: number, text: string) => {
  for (let i = 0; i < text.length; i++) data.setUint8(offset + i, text.charCodeAt(i));
};
writeString(0, "RIFF");
data.setUint32(4, 36 + total * 2, true);
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
data.setUint32(40, total * 2, true);
for (let i = 0; i < total; i++) data.setInt16(44 + i * 2, pcm[i] ?? 0, true);

const packageDir = resolve(import.meta.dir, "../packages/video");
const workDir = await mkdtemp(join(tmpdir(), "wyg-world-track-"));
const wav = join(workDir, "track.wav");
await Bun.write(wav, data.buffer);
const out = resolve(packageDir, "public", WORLD_TRACK.file);
await $`bunx remotion ffmpeg -v error -y -i ${wav} -c:a aac -b:a 160k -f mp4 ${out}`
  .cwd(packageDir)
  .quiet();

// --- Checks on the decoded file, as a browser would hear it -------------------------------------
// Remotion's FFmpeg has no raw-float muxer, so decode to a 16-bit WAV and read its data chunk.
const decodedWav = join(workDir, "decoded.wav");
await $`bunx remotion ffmpeg -v error -y -i ${out} -c:a pcm_s16le -ac 1 -f wav ${decodedWav}`
  .cwd(packageDir)
  .quiet();
const decodedBytes = new Uint8Array(await Bun.file(decodedWav).arrayBuffer());
await rm(workDir, { recursive: true });
const dataAt = new TextDecoder("latin1").decode(decodedBytes).indexOf("data") + 8;
const decodedView = new DataView(decodedBytes.buffer, dataAt);
const decoded = new Float32Array(Math.floor(decodedView.byteLength / 2));
for (let i = 0; i < decoded.length; i++) decoded[i] = decodedView.getInt16(i * 2, true) / 0x7fff;
const source = Float32Array.from(pcm, (s) => s / 0x7fff);

const db = (value: number) => 20 * Math.log10(Math.max(value, 1e-12));
const rms = (signal: Float32Array, from: number, to: number) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (signal[i] ?? 0) ** 2;
  return Math.sqrt(sum / (to - from));
};
const maxJump = (signal: Float32Array, from: number, to: number) => {
  let max = 0;
  for (let i = from + 1; i < to; i++) {
    max = Math.max(max, Math.abs((signal[i] ?? 0) - (signal[i - 1] ?? 0)));
  }
  return max;
};

// Encoder offset: the lag that best lines the decoded audio up with what we encoded.
let bestLag = 0;
let bestScore = -Infinity;
const probeFrom = loopStart + beatSamples;
for (let lag = -4096; lag <= 4096; lag++) {
  let score = 0;
  for (let i = probeFrom; i < probeFrom + 8192; i += 2) {
    score += (source[i] ?? 0) * (decoded[i + lag] ?? 0);
  }
  if (score > bestScore) {
    bestScore = score;
    bestLag = lag;
  }
}

let peak = 0;
let clipped = 0;
for (const sample of decoded) {
  peak = Math.max(peak, Math.abs(sample));
  // 16-bit decode: a full-scale sample means the encoder overshot and clipped.
  if (Math.abs(sample) >= 1) clipped++;
}

const window50 = Math.round(0.05 * SAMPLE_RATE);
const seamReport = (signal: Float32Array) => {
  const tail = db(rms(signal, loopEnd - window50, loopEnd));
  const head = db(rms(signal, loopStart, loopStart + window50));
  const seamJump = Math.abs((signal[loopStart] ?? 0) - (signal[loopEnd - 1] ?? 0));
  const neighbours = Math.max(
    maxJump(signal, loopEnd - window50, loopEnd),
    maxJump(signal, loopStart, loopStart + window50),
  );
  return { tail, head, seamJump, neighbours };
};
let introMismatch = 0;
for (let i = 0; i < loopLength; i++) {
  introMismatch = Math.max(introMismatch, Math.abs((cutIntro[i] ?? 0) - (wrappedTonal[i] ?? 0)));
}

const encoded = seamReport(source);
const heard = seamReport(decoded);
const seconds = total / SAMPLE_RATE;
console.log(`Wrote ${out} (${seconds}s, ${WORLD_TRACK.bpm} BPM, ${WORLD_TRACK.beats} beats).`);
console.log(`Decoded: ${decoded.length} samples (${(decoded.length / SAMPLE_RATE).toFixed(4)}s)`);
console.log(`Encoder offset: ${bestLag} samples`);
console.log(`Peak: ${db(peak).toFixed(2)} dBFS, clipped samples: ${clipped}`);
for (const [name, r] of [
  ["Encoded", encoded],
  ["Decoded", heard],
] as const) {
  console.log(
    `${name} seam: last 50 ms ${r.tail.toFixed(2)} dB, first 50 ms ${r.head.toFixed(2)} dB, ` +
      `jump ${r.seamJump.toFixed(5)} vs neighbours up to ${r.neighbours.toFixed(5)}`,
  );
}
console.log(
  `Intro tails cut vs wrapped loop tails: max difference ${(introMismatch * scale).toFixed(6)}`,
);

const failures = [
  bestLag !== 0 && `encoder offset is ${bestLag} samples; set WORLD_TRACK.offsetMs`,
  db(peak) > -1 && "peak above -1 dBFS",
  clipped > 0 && "clipped samples",
  Math.abs(heard.tail - heard.head) > 3 && "seam levels differ by more than 3 dB",
  heard.seamJump > heard.neighbours && "click at the seam",
  Math.abs(decoded.length / SAMPLE_RATE - seconds) > 0.05 && "decoded length is off",
].filter(Boolean);
if (failures.length > 0) {
  console.error(`Checks failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("All checks passed.");
