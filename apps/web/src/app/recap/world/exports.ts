// Client only: renders with Remotion in the browser. Never import this from server code.
import {
  canRenderMediaOnWeb,
  type RenderMediaOnWebProgressCallback,
  renderMediaOnWeb,
  renderStillOnWeb,
} from "@remotion/web-renderer";
import { type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import { WorldStory } from "@wyg/video";
import {
  type ExportFormat,
  exportFileName,
  slideFrames,
  worldExportComposition,
} from "@wyg/video/world";
import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

export type Slide = { name: string; blob: Blob };
export type ExportSupport = { mp4: boolean; stills: boolean; reason: string | null };

type WorldComposition = ReturnType<typeof worldExportComposition> & {
  component: typeof WorldStory;
};
type WorldProps = WorldComposition["defaultProps"];

export type MediaOptions = {
  composition: WorldComposition;
  inputProps: WorldProps;
  container: "mp4";
  videoCodec: "h264";
  audioCodec: "aac";
  signal: AbortSignal;
  onProgress: RenderMediaOnWebProgressCallback;
};
export type StillOptions = {
  composition: WorldComposition;
  inputProps: WorldProps;
  frame: number;
  signal: AbortSignal;
};

/** The browser-side renderer, injectable so the logic around it is testable without a browser. */
export type ExportEngine = {
  canRender: typeof canRenderMediaOnWeb;
  stillsAvailable: () => boolean;
  renderMedia: (options: MediaOptions) => Promise<Blob>;
  renderStill: (options: StillOptions) => Promise<Blob>;
};

const defaultEngine: ExportEngine = {
  canRender: canRenderMediaOnWeb,
  // Stills are drawn on an OffscreenCanvas and encoded with convertToBlob.
  stillsAvailable: () =>
    typeof OffscreenCanvas !== "undefined" && "convertToBlob" in OffscreenCanvas.prototype,
  renderMedia: async (options) => (await renderMediaOnWeb(options)).getBlob(),
  renderStill: async (options) => (await renderStillOnWeb(options)).blob({ format: "png" }),
};

const composition = (data: RecapData, format: ExportFormat): WorldComposition => ({
  ...worldExportComposition(data, format),
  component: WorldStory,
});

const engineWith = (overrides: Partial<ExportEngine>): ExportEngine => ({
  ...defaultEngine,
  ...overrides,
});

const MP4_REASON =
  "This browser can't make the video. Try a recent Chrome or Edge, or save the slides instead.";
const STILLS_REASON = "This browser can't draw the slides. Try a recent Chrome, Edge or Firefox.";
const NOTHING_REASON = "This browser can't make your files. Try a recent Chrome or Edge.";

/**
 * The two extreme frames: 16:9 is the widest, 9:16 the tallest, and 4:5 and 1:1 are no wider than
 * the one, no taller than the other and no larger in area. Hardware encoders limit width and height
 * separately (some cap height near 1088), so a passing landscape check says nothing about portrait.
 */
const EXTREMES = [VIDEO_FORMATS["16x9"], VIDEO_FORMATS["9x16"]];

async function encodes(engine: ExportEngine, width: number, height: number): Promise<boolean> {
  try {
    const result = await engine.canRender({
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      width,
      height,
    });
    // Not `result.canRender`: it always folds in a WebGL check, and the world draws no WebGL
    // or 3D CSS (ADR-0013), so a missing WebGL must not cost the reader the video.
    return !result.issues.some(
      (issue) => issue.severity === "error" && issue.type !== "webgl-unsupported",
    );
  } catch {
    return false;
  }
}

/** What this browser can render: an H.264/AAC MP4 in every format, and PNG stills. */
export async function exportSupport(overrides: Partial<ExportEngine> = {}): Promise<ExportSupport> {
  const engine = engineWith(overrides);
  const checks = await Promise.all(
    EXTREMES.map(({ width, height }) => encodes(engine, width, height)),
  );
  const mp4 = checks.every(Boolean);
  let stills = false;
  try {
    stills = engine.stillsAvailable();
  } catch {
    stills = false;
  }
  const reason = mp4 && stills ? null : mp4 ? STILLS_REASON : stills ? MP4_REASON : NOTHING_REASON;
  return { mp4, stills, reason };
}

export function renderMp4(
  data: RecapData,
  format: ExportFormat,
  { onProgress, signal }: { onProgress: (p: number) => void; signal: AbortSignal },
  overrides: Partial<ExportEngine> = {},
): Promise<Blob> {
  const world = composition(data, format);
  return cancellable(signal, () =>
    engineWith(overrides).renderMedia({
      composition: world,
      inputProps: world.defaultProps,
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      signal,
      onProgress: (progress) => onProgress(progress.progress),
    }),
  );
}

const aborted = () => new DOMException("The export was cancelled.", "AbortError");

/** Whatever the renderer throws once the signal has aborted, callers see one AbortError. */
async function cancellable<T>(signal: AbortSignal, run: () => Promise<T>): Promise<T> {
  if (signal.aborted) throw aborted();
  try {
    return await run();
  } catch (error) {
    throw signal.aborted ? aborted() : error;
  }
}

/** One PNG per stop, one at a time: the web renderer is single-threaded and shares the tab. */
export async function renderSlides(
  data: RecapData,
  options: { onProgress: (done: number, total: number) => void; signal: AbortSignal },
  overrides: Partial<ExportEngine> = {},
): Promise<Slide[]> {
  const engine = engineWith(overrides);
  const { onProgress, signal } = options;
  const world = composition(data, "4x5");
  const frames = slideFrames(data);
  const slides: Slide[] = [];
  onProgress(0, frames.length);
  for (const [i, { stopId, frame }] of frames.entries()) {
    const blob = await cancellable(signal, () =>
      engine.renderStill({ composition: world, inputProps: world.defaultProps, frame, signal }),
    );
    slides.push({ name: exportFileName("png", data, { index: i + 1, stopId }), blob });
    onProgress(i + 1, frames.length);
  }
  if (signal.aborted) throw aborted();
  return slides;
}

const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

/** PNGs are already compressed, so entries are stored. */
export async function zipSlides(slides: Slide[]): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  for (const slide of slides) files[slide.name] = await bytes(slide.blob);
  return new Blob([new Uint8Array(zipSync(files, { level: 0 }))], { type: "application/zip" });
}

/** The whole story, letter included: one 4:5 page per slide. */
export async function pdfSlides(slides: Slide[], { title }: { title: string }): Promise<Blob> {
  const { width, height } = VIDEO_FORMATS["4x5"];
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setCreator("WrapYourGit");
  for (const slide of slides) {
    const image = await pdf.embedPng(await bytes(slide.blob));
    pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // Revoke on the next task: the click has started the download by then.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
