// Client only: renders with Remotion in the browser. Never import this from server code.
import {
  canRenderMediaOnWeb,
  type RenderMediaOnWebProgressCallback,
  renderMediaOnWeb,
  renderStillOnWeb,
} from "@remotion/web-renderer";
import { type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import { RideStory } from "@wyg/video";
import {
  type ExportFormat,
  exportFileName,
  slideFrames,
  worldExportComposition,
} from "@wyg/video/export";
import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

export type Slide = { name: string; blob: Blob };
export type ExportSupport = { mp4: boolean; stills: boolean; reason: string | null };

type WorldComposition = ReturnType<typeof worldExportComposition> & {
  component: typeof RideStory;
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

/**
 * WrapYourGit is a personal project, so Remotion's Free License applies (an individual; see
 * ADR-0016 and https://remotion.dev/license). If it ever becomes a company's product, this needs
 * a Company License key instead.
 */
const LICENSE_KEY = "free-license";

const defaultEngine: ExportEngine = {
  canRender: canRenderMediaOnWeb,
  // Stills are drawn on an OffscreenCanvas and encoded with convertToBlob.
  stillsAvailable: () =>
    typeof OffscreenCanvas !== "undefined" && "convertToBlob" in OffscreenCanvas.prototype,
  renderMedia: async (options) =>
    (await renderMediaOnWeb({ ...options, licenseKey: LICENSE_KEY })).getBlob(),
  renderStill: async (options) =>
    (await renderStillOnWeb({ ...options, licenseKey: LICENSE_KEY })).blob({ format: "png" }),
};

/** `letter: false` leaves the letter's pages out, as a visitor's story does; it is on by default. */
export type LetterOption = { letter?: boolean };

const composition = (
  data: RecapData,
  format: ExportFormat,
  { letter }: LetterOption,
): WorldComposition => ({
  ...worldExportComposition(data, format, { letter }),
  component: RideStory,
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
  {
    onProgress,
    signal,
    letter,
  }: { onProgress: (p: number) => void; signal: AbortSignal } & LetterOption,
  overrides: Partial<ExportEngine> = {},
): Promise<Blob> {
  const world = composition(data, format, { letter });
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
  options: {
    onProgress: (done: number, total: number) => void;
    signal: AbortSignal;
  } & LetterOption,
  overrides: Partial<ExportEngine> = {},
): Promise<Slide[]> {
  const engine = engineWith(overrides);
  const { onProgress, signal, letter } = options;
  const world = composition(data, "4x5", { letter });
  const frames = slideFrames(data, { letter });
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

/*
 * fflate and pdf-lib type their output as Uint8Array<ArrayBufferLike>, which BlobPart refuses for
 * fear of a SharedArrayBuffer. Both allocate a plain ArrayBuffer, so narrow the type instead of
 * copying a whole ZIP or PDF a second time.
 */
const blobOf = (data: Uint8Array, type: string) =>
  new Blob([data as Uint8Array<ArrayBuffer>], { type });

/** PNGs are already compressed, so entries are stored. */
export async function zipSlides(slides: Slide[]): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  for (const slide of slides) files[slide.name] = await bytes(slide.blob);
  return blobOf(zipSync(files, { level: 0 }), "application/zip");
}

/** The whole story as rendered (letter included unless left out): one 4:5 page per slide. */
export async function pdfSlides(slides: Slide[], { title }: { title: string }): Promise<Blob> {
  const { width, height } = VIDEO_FORMATS["4x5"];
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setCreator("WrapYourGit");
  for (const slide of slides) {
    const image = await pdf.embedPng(await bytes(slide.blob));
    pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  }
  return blobOf(await pdf.save(), "application/pdf");
}

/**
 * Firefox and Safari have failed or truncated downloads whose blob URL was revoked right after
 * `click()`; FileSaver.js waits 40 s. Only the URL holds the blob, so it is freed after that.
 */
export const REVOKE_AFTER_MS = 40_000;

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  // Firefox ignores a click on a link that isn't in the document.
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}
