/*
 * Spike (#147, never merged): measures on the device what a faster MP4 export could get, at
 * 1080x1920, 30 fps, on the sample recap. Plain browser code, so the same bench runs in the Next
 * route and in a self-contained page.
 */
import { rideLogos } from "@wyg/video/ride-bench";
import { sampleRecap } from "@wyg/video/sample";
import type { FromWorker, ToWorker } from "./bench.worker";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const BITRATE = 3_200_000;
const SAMPLE = 300;
/** Frames waiting in the encoder before the bench stops feeding it. */
const QUEUE = 2;
const KEYFRAME_EVERY = 60;

export type Row = { section: string; name: string; value: string };
export type Report = (row: Row) => void;
export type Status = (text: string) => void;

export type BenchHost = {
  makeWorker: () => Worker;
  /** Where the logos come from: the prims' href is mapped to a URL the page can load. */
  logoUrl?: (href: string) => string;
};

const PROFILES = [
  ["High", "6400"],
  ["Main", "4d00"],
  ["Baseline", "4200"],
] as const;
const LEVELS = [
  ["4.0", "28"],
  ["4.1", "29"],
] as const;
type Accel = "prefer-hardware" | "prefer-software";

function config(codec: string, accel: Accel, latency: LatencyMode = "quality"): VideoEncoderConfig {
  return {
    codec,
    width: WIDTH,
    height: HEIGHT,
    bitrate: BITRATE,
    framerate: FPS,
    hardwareAcceleration: accel,
    latencyMode: latency,
    avc: { format: "avc" },
  };
}

const ms = (n: number) => `${n.toFixed(1)} ms`;
const sec = (n: number) => `${(n / 1000).toFixed(1)} s`;

function stats(xs: number[]): string {
  if (xs.length === 0) return "-";
  const sorted = [...xs].sort((a, b) => a - b);
  const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
  const pick = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return `avg ${avg.toFixed(1)} / p50 ${pick(0.5).toFixed(1)} / p95 ${pick(0.95).toFixed(1)} ms`;
}

function withTimeout<T>(promise: Promise<T>, after: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${what}: timed out after ${after} ms`)),
      after,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Waits until the encoder has room; without this the queue grows and the run stalls. */
async function room(encoder: VideoEncoder, failed: () => Error | null) {
  while (encoder.encodeQueueSize > QUEUE) {
    const error = failed();
    if (error) throw error;
    await withTimeout(
      new Promise((resolve) => encoder.addEventListener("dequeue", resolve, { once: true })),
      15_000,
      "Encoder dequeue",
    );
  }
  const error = failed();
  if (error) throw error;
}

function frameAt(seq: number, source: CanvasImageSource) {
  return new VideoFrame(source, {
    timestamp: Math.round((seq * 1_000_000) / FPS),
    duration: Math.round(1_000_000 / FPS),
  });
}

function synthetic(brush: OffscreenCanvasRenderingContext2D, i: number) {
  brush.fillStyle = `hsl(${(i * 3) % 360} 60% 45%)`;
  brush.fillRect(0, 0, WIDTH, HEIGHT);
  brush.fillStyle = `hsl(${(i * 3 + 180) % 360} 70% 60%)`;
  for (let k = 0; k < 12; k++) {
    brush.fillRect(((i * 7 + k * 97) % WIDTH) - 60, k * 160, 240, 120);
  }
  brush.fillStyle = "#fff";
  brush.font = "bold 120px sans-serif";
  brush.fillText(String(i), 80, HEIGHT / 2);
}

/** 1. Encoder support, and what the first chunk says when a config is supported. */
async function probe(cfg: VideoEncoderConfig): Promise<string> {
  let support: VideoEncoderSupport;
  try {
    support = await VideoEncoder.isConfigSupported(cfg);
  } catch (error) {
    return `isConfigSupported threw: ${errorText(error)}`;
  }
  if (!support.supported) return "no";
  let first: { chunk: EncodedVideoChunk; meta?: EncodedVideoChunkMetadata } | null = null;
  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      first ??= { chunk, meta };
    },
    error: (error) => {
      failure = error;
    },
  });
  try {
    encoder.configure(cfg);
    const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
    const brush = canvas.getContext("2d");
    if (brush) synthetic(brush, 0);
    const frame = frameAt(0, canvas);
    encoder.encode(frame, { keyFrame: true });
    frame.close();
    await withTimeout(encoder.flush(), 10_000, "flush");
  } catch (error) {
    return `yes, but encoding failed: ${errorText(failure ?? error)}`;
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
  const got = first as { chunk: EncodedVideoChunk; meta?: EncodedVideoChunkMetadata } | null;
  if (!got) return "yes, but no chunk came out";
  const dc = got.meta?.decoderConfig;
  const description = dc?.description ? `${(dc.description as ArrayBuffer).byteLength} B` : "none";
  return `yes; chunk ${got.chunk.type} ${got.chunk.byteLength} B; decoderConfig ${dc?.codec ?? "?"} coded ${dc?.codedWidth ?? "?"}x${dc?.codedHeight ?? "?"} display ${dc?.displayAspectWidth ?? "-"}x${dc?.displayAspectHeight ?? "-"} desc ${description}`;
}

/** 2. Encode-only: synthetic frames from the main thread into one encoder. */
async function encodeOnly(cfg: VideoEncoderConfig): Promise<string> {
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const brush = canvas.getContext("2d");
  if (!brush) throw new Error("No 2D context");
  let bytes = 0;
  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk) => {
      bytes += chunk.byteLength;
    },
    error: (error) => {
      failure = error;
    },
  });
  encoder.configure(cfg);
  const t0 = performance.now();
  try {
    for (let i = 0; i < SAMPLE; i++) {
      synthetic(brush, i);
      const frame = frameAt(i, canvas);
      await room(encoder, () => failure);
      encoder.encode(frame, { keyFrame: i % KEYFRAME_EVERY === 0 });
      frame.close();
    }
    await withTimeout(encoder.flush(), 30_000, "flush");
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
  const total = performance.now() - t0;
  const mbps = (bytes * 8) / (SAMPLE / FPS) / 1e6;
  return `${ms(total / SAMPLE)}/frame (${SAMPLE} frames in ${sec(total)}, ${mbps.toFixed(1)} Mbps out)`;
}

type Helper = { worker: Worker; send: (msg: ToWorker, transfer?: Transferable[]) => void };

function next(worker: Worker): Promise<FromWorker> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      if (event.data.type === "error") reject(new Error(event.data.message));
      else resolve(event.data);
    };
    worker.onerror = (event) => reject(new Error(event.message || "Worker failed to load"));
  });
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  let src = url;
  if (/\.svg($|\?)/.test(url) || url.startsWith("data:image/svg")) {
    const text = await (await fetch(url)).text();
    const tag = text.match(/<svg[^>]*>/)?.[0] ?? "";
    const sized = /\swidth=/.test(tag)
      ? text
      : text.replace("<svg", '<svg width="256" height="256"');
    src = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  }
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = src;
  });
  return image;
}

function bitmap(image: HTMLImageElement): ImageBitmap {
  const w = image.naturalWidth || 256;
  const h = image.naturalHeight || 256;
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext("2d")?.drawImage(image, 0, 0, w, h);
  return canvas.transferToImageBitmap();
}

async function startWorkers(
  host: BenchHost,
  count: number,
  images: Map<string, HTMLImageElement>,
  report: Report,
): Promise<{ helpers: Helper[]; durationInFrames: number }> {
  const helpers: Helper[] = [];
  let durationInFrames = 0;
  for (let k = 0; k < count; k++) {
    const worker = host.makeWorker();
    const helper: Helper = {
      worker,
      send: (msg, transfer = []) => worker.postMessage(msg, transfer),
    };
    const entries = [...images].map(
      ([href, image]) => [href, bitmap(image)] as [string, ImageBitmap],
    );
    const ready = next(worker);
    helper.send(
      { type: "init", images: entries },
      entries.map(([, b]) => b),
    );
    const msg = await withTimeout(ready, 60_000, `Worker ${k + 1} init`);
    if (msg.type !== "ready") throw new Error(`Worker ${k + 1}: unexpected ${msg.type}`);
    durationInFrames = msg.durationInFrames;
    if (k === 0) {
      report({ section: "Workers", name: "font in worker", value: msg.font });
      report({ section: "Workers", name: "first worker init", value: ms(msg.initMs) });
    }
    helpers.push(helper);
  }
  return { helpers, durationInFrames };
}

function spread(duration: number, n: number): number[] {
  return Array.from({ length: n }, (_, k) => Math.round((k * (duration - 1)) / (n - 1)));
}

/** Six runs of 50 consecutive frames spread over the ride: real motion, every part of it. */
function blocks(duration: number): number[] {
  const out: number[] = [];
  for (let b = 0; b < 6; b++) {
    const start = Math.round(((b + 0.5) * duration) / 6) - 25;
    for (let k = 0; k < 50; k++) out.push(Math.min(duration - 1, Math.max(0, start + k)));
  }
  return out;
}

/** 3. Paint-only in one worker. */
async function paintOnly(helper: Helper, frames: number[], report: Report) {
  const done = next(helper.worker);
  helper.send({ type: "paint", frames });
  const msg = await withTimeout(done, 300_000, "Paint");
  if (msg.type !== "paint-result") throw new Error(`Unexpected ${msg.type}`);
  report({
    section: "3 Paint (worker, Canvas 2D)",
    name: "scene (rideFrame+backdrop+scenePrims)",
    value: stats(msg.scene),
  });
  report({
    section: "3 Paint (worker, Canvas 2D)",
    name: "paint (paintPrims, roll)",
    value: stats(msg.paint),
  });
  report({
    section: "3 Paint (worker, Canvas 2D)",
    name: "new VideoFrame(canvas)",
    value: stats(msg.snap),
  });
  report({
    section: "3 Paint (worker, Canvas 2D)",
    name: "wall per frame",
    value: `${ms(msg.wallMs / frames.length)} (${frames.length} frames spread over the ride)`,
  });
}

/** 4. Workers draw, the main thread encodes in frame order. */
async function pipeline(
  helpers: Helper[],
  frames: number[],
  cfg: VideoEncoderConfig,
  status: Status,
): Promise<{ perFrame: number; total: number; scene: number; paint: number; mbps: number }> {
  let bytes = 0;
  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk) => {
      bytes += chunk.byteLength;
    },
    error: (error) => {
      failure = error;
    },
  });
  encoder.configure(cfg);
  const pending = new Map<number, VideoFrame>();
  const ahead = helpers.length * 2;
  let requested = 0;
  let encoded = 0;
  let scene = 0;
  let paint = 0;
  const t0 = performance.now();

  try {
    await new Promise<void>((resolve, reject) => {
      const request = () => {
        while (requested < frames.length && requested - encoded < ahead) {
          const seq = requested++;
          const helper = helpers[seq % helpers.length];
          helper?.send({ type: "draw", seq, i: frames[seq] ?? 0 });
        }
      };
      let pumping = false;
      const pump = async () => {
        if (pumping) return;
        pumping = true;
        try {
          while (pending.has(encoded)) {
            await room(encoder, () => failure);
            const frame = pending.get(encoded);
            pending.delete(encoded);
            if (frame) {
              encoder.encode(frame, { keyFrame: encoded % KEYFRAME_EVERY === 0 });
              frame.close();
            }
            encoded++;
            if (encoded % 30 === 0) status(`encoding ${encoded}/${frames.length}`);
            request();
          }
          if (encoded === frames.length) {
            await withTimeout(encoder.flush(), 60_000, "flush");
            resolve();
          }
        } catch (error) {
          reject(error);
        } finally {
          pumping = false;
        }
      };
      for (const helper of helpers) {
        helper.worker.onmessage = (event: MessageEvent<FromWorker>) => {
          const msg = event.data;
          if (msg.type === "frame") {
            pending.set(msg.seq, msg.frame);
            scene += msg.scene;
            paint += msg.paint;
            void pump();
          } else if (msg.type === "error") {
            reject(new Error(msg.message));
          }
        };
      }
      request();
    });
  } finally {
    for (const frame of pending.values()) frame.close();
    if (encoder.state !== "closed") encoder.close();
  }
  const total = performance.now() - t0;
  return {
    perFrame: total / frames.length,
    total,
    scene: scene / frames.length,
    paint: paint / frames.length,
    mbps: (bytes * 8) / (frames.length / FPS) / 1e6,
  };
}

export function environment(report: Report) {
  const nav = navigator as Navigator & { deviceMemory?: number };
  report({ section: "Device", name: "userAgent", value: nav.userAgent });
  report({
    section: "Device",
    name: "hardwareConcurrency",
    value: String(nav.hardwareConcurrency),
  });
  report({ section: "Device", name: "deviceMemory", value: String(nav.deviceMemory ?? "n/a") });
  report({
    section: "Device",
    name: "APIs",
    value: [
      `VideoEncoder ${typeof VideoEncoder !== "undefined"}`,
      `OffscreenCanvas ${typeof OffscreenCanvas !== "undefined"}`,
      `Worker ${typeof Worker !== "undefined"}`,
    ].join(", "),
  });
}

export type BenchState = {
  best: VideoEncoderConfig | null;
  helpers: Helper[];
  durationInFrames: number;
  bestN: number;
};

export async function runBench(
  host: BenchHost,
  report: Report,
  status: Status,
): Promise<BenchState> {
  const state: BenchState = { best: null, helpers: [], durationInFrames: 0, bestN: 1 };
  environment(report);
  if (typeof VideoEncoder === "undefined") {
    report({ section: "Device", name: "stop", value: "No WebCodecs VideoEncoder here" });
    return state;
  }

  // 1. Support.
  let bestHw: VideoEncoderConfig | null = null;
  let bestSw: VideoEncoderConfig | null = null;
  for (const accel of ["prefer-hardware", "prefer-software"] as const) {
    for (const [profile, hex] of PROFILES) {
      for (const [level, lhex] of LEVELS) {
        const codec = `avc1.${hex}${lhex}`;
        status(`1/4 probing ${codec} ${accel}`);
        const cfg = config(codec, accel);
        const result = await probe(cfg);
        report({
          section: "1 Support",
          name: `${accel === "prefer-hardware" ? "HW" : "SW"} ${profile} ${level} (${codec})`,
          value: result,
        });
        if (result.startsWith("yes;")) {
          if (accel === "prefer-hardware") bestHw ??= cfg;
          else bestSw ??= cfg;
        }
      }
    }
  }
  state.best = bestHw ?? bestSw;
  report({
    section: "1 Support",
    name: "chosen for pipeline",
    value: state.best ? `${state.best.codec} ${state.best.hardwareAcceleration}` : "none",
  });

  // 2. Encode-only.
  const runs: [string, VideoEncoderConfig | null][] = [
    ["HW quality", bestHw],
    ["HW realtime", bestHw && { ...bestHw, latencyMode: "realtime" }],
    ["SW quality", bestSw],
  ];
  for (const [name, cfg] of runs) {
    if (!cfg) {
      report({ section: "2 Encode only", name, value: "skipped (no supported config)" });
      continue;
    }
    status(`2/4 encode-only ${name}`);
    try {
      report({
        section: "2 Encode only",
        name: `${name} ${cfg.codec}`,
        value: await encodeOnly(cfg),
      });
    } catch (error) {
      report({
        section: "2 Encode only",
        name: `${name} ${cfg.codec}`,
        value: `failed: ${errorText(error)}`,
      });
    }
  }

  // Logos for the workers.
  status("loading logos");
  const images = new Map<string, HTMLImageElement>();
  const logos = rideLogos(sampleRecap);
  await Promise.allSettled(
    logos.map(async (href) => {
      images.set(href, await loadImage(host.logoUrl ? host.logoUrl(href) : href));
    }),
  );
  report({ section: "Workers", name: "logos loaded", value: `${images.size}/${logos.length}` });

  // 3. Paint-only.
  status("3/4 starting workers");
  try {
    const started = await startWorkers(host, 4, images, report);
    state.helpers = started.helpers;
    state.durationInFrames = started.durationInFrames;
  } catch (error) {
    report({ section: "Workers", name: "start", value: `failed: ${errorText(error)}` });
    return state;
  }
  report({ section: "Workers", name: "ride length", value: `${state.durationInFrames} frames` });
  const first = state.helpers[0];
  if (first) {
    status("3/4 paint-only");
    try {
      await paintOnly(first, spread(state.durationInFrames, SAMPLE), report);
    } catch (error) {
      report({
        section: "3 Paint (worker, Canvas 2D)",
        name: "run",
        value: `failed: ${errorText(error)}`,
      });
    }
  }

  // 4. Full prototype.
  if (!state.best) return state;
  let bestPerFrame = Number.POSITIVE_INFINITY;
  for (const n of [1, 2, 4]) {
    status(`4/4 pipeline with ${n} worker(s)`);
    try {
      const r = await pipeline(
        state.helpers.slice(0, n),
        blocks(state.durationInFrames),
        state.best,
        (s) => status(`4/4 ${n} worker(s): ${s}`),
      );
      if (r.perFrame < bestPerFrame) {
        bestPerFrame = r.perFrame;
        state.bestN = n;
      }
      report({
        section: "4 Pipeline",
        name: `${n} worker(s), ${state.best.codec} ${state.best.hardwareAcceleration}`,
        value: `${ms(r.perFrame)}/frame -> whole video ~${sec(r.perFrame * state.durationInFrames)} (in-worker scene ${r.scene.toFixed(1)} + paint ${r.paint.toFixed(1)} ms, ${r.mbps.toFixed(1)} Mbps)`,
      });
    } catch (error) {
      report({
        section: "4 Pipeline",
        name: `${n} worker(s)`,
        value: `failed: ${errorText(error)}`,
      });
    }
  }
  return state;
}

/** Optional: the whole ride through the pipeline, with the fastest worker count. */
export async function runWhole(state: BenchState, report: Report, status: Status) {
  if (!state.best || state.helpers.length === 0) return;
  const n = state.bestN;
  const frames = Array.from({ length: state.durationInFrames }, (_, i) => i);
  try {
    const r = await pipeline(state.helpers.slice(0, n), frames, state.best, (s) =>
      status(`whole video, ${n} worker(s): ${s}`),
    );
    report({
      section: "5 Whole video",
      name: `${n} worker(s), ${frames.length} frames`,
      value: `${sec(r.total)} (${ms(r.perFrame)}/frame, ${r.mbps.toFixed(1)} Mbps)`,
    });
  } catch (error) {
    report({
      section: "5 Whole video",
      name: `${n} worker(s)`,
      value: `failed: ${errorText(error)}`,
    });
  }
}

export function stopWorkers(state: BenchState) {
  for (const helper of state.helpers) helper.worker.terminate();
  state.helpers = [];
}

export function resultsText(rows: Row[]): string {
  const lines = [`WrapYourGit export bench (#147), ${new Date().toISOString()}`];
  let section = "";
  for (const row of rows) {
    if (row.section !== section) {
      section = row.section;
      lines.push("", `## ${section}`);
    }
    lines.push(`${row.name}: ${row.value}`);
  }
  return lines.join("\n");
}
