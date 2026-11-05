/**
 * Renders single frames of the story composition to PNG on this machine, for the slide exports:
 * a slide is a chapter's finished last frame, drawn by the same composition the story and the MP4
 * use, so an export always looks exactly like the story (ADR-0011).
 *
 * Runs inside the still worker (still-worker.ts), a separate Bun process, never inside Next: the
 * composition is bundled once per worker and one headless browser is shared. Frames render one at
 * a time: parallel tabs on one machine contend for WebGL when baking the 3D loops (ADR-0013).
 */
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { bundle } from "@remotion/bundler";
import {
  type ChromiumOptions,
  ensureBrowser,
  type HeadlessBrowser,
  openBrowser,
  renderFrames,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import type { RecapData } from "@wyg/schema";

/**
 * packages/video, found by walking up from the working directory. Not from import.meta: once Next
 * bundles this module, import.meta.dirname is undefined. Looked up lazily, so a missing checkout
 * fails the render (a 503 in the routes), not the module import.
 */
function videoDir(): string {
  let dir = process.cwd();
  for (;;) {
    const candidate = join(dir, "packages/video");
    if (existsSync(join(candidate, "src/remotion-entry.ts"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`packages/video not found above ${process.cwd()}`);
    dir = parent;
  }
}

/**
 * WebGL backend for headless Chrome. Linux servers need ANGLE on EGL (plain `angle` cannot create a
 * context there); override with REMOTION_GL, e.g. "swangle" on a machine without a GPU.
 */
const GL = (process.env.REMOTION_GL ??
  (process.platform === "linux" ? "angle-egl" : "angle")) as ChromiumOptions["gl"];
const chromiumOptions: ChromiumOptions = { gl: GL };

let served: Promise<string> | null = null;
let browser: Promise<HeadlessBrowser> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** The webpack bundle of packages/video, built on first use and kept for the process. */
function serveUrl(): Promise<string> {
  served ??= Promise.resolve()
    .then(() => {
      const video = videoDir();
      return bundle({
        entryPoint: join(video, "src/remotion-entry.ts"),
        publicDir: join(video, "public"),
        outDir: join(tmpdir(), "wrapyourgit-remotion-bundle"),
      });
    })
    .catch((error: unknown) => {
      served = null;
      throw error;
    });
  return served;
}

function sharedBrowser(): Promise<HeadlessBrowser> {
  browser ??= ensureBrowser()
    .then(() => openBrowser("chrome", { chromiumOptions }))
    .catch((error: unknown) => {
      browser = null;
      throw error;
    });
  return browser;
}

/** Runs renders one after another, whatever order callers arrive in. */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * One frame of `composition` (e.g. "wrap-4x5") as PNG bytes. `data` must already be the public
 * projection when the file is meant to be shared.
 */
export function renderSceneStill(
  data: RecapData,
  composition: string,
  frame: number,
): Promise<Uint8Array> {
  return serial(async () => {
    const [url, puppeteerInstance] = await Promise.all([serveUrl(), sharedBrowser()]);
    // The story plays the music separately; a still has no sound anyway.
    const inputProps = { data, music: false };
    const target = await selectComposition({
      serveUrl: url,
      id: composition,
      inputProps,
      puppeteerInstance,
      chromiumOptions,
    });
    const { buffer } = await renderStill({
      serveUrl: url,
      composition: target,
      frame,
      inputProps,
      imageFormat: "png",
      puppeteerInstance,
      chromiumOptions,
      // Fonts, sprite sheets and photos load before the frame is ready.
      timeoutInMilliseconds: 60_000,
    });
    if (!buffer) throw new Error(`renderStill returned no image for frame ${frame}`);
    return new Uint8Array(buffer);
  });
}

/**
 * Several frames of `composition` as PNG bytes, in one pass with one tab: used to bake the
 * looping art (scripts/render-art.ts). `frames` are composition frame numbers.
 */
export function renderCompositionFrames(
  composition: string,
  frames: number[],
  inputProps: Record<string, unknown> = {},
  /** Tabs in parallel: two is safe for one small canvas; story frames render one at a time. */
  concurrency = 2,
): Promise<Map<number, Uint8Array>> {
  return serial(async () => {
    const [url, puppeteerInstance] = await Promise.all([serveUrl(), sharedBrowser()]);
    const target = await selectComposition({
      serveUrl: url,
      id: composition,
      inputProps,
      puppeteerInstance,
      chromiumOptions,
    });
    const out = new Map<number, Uint8Array>();
    await renderFrames({
      serveUrl: url,
      composition: target,
      frames,
      inputProps,
      imageFormat: "png",
      outputDir: null,
      concurrency,
      puppeteerInstance,
      chromiumOptions,
      timeoutInMilliseconds: 60_000,
      onStart: () => undefined,
      onFrameUpdate: () => undefined,
      onFrameBuffer: (buffer, frame) => {
        out.set(frame, new Uint8Array(buffer));
      },
    });
    return out;
  });
}
