// Client only: renders with Remotion in the browser. Never import this from server code.
import { canRenderMediaOnWeb, renderMediaOnWeb, renderStillOnWeb } from "@remotion/web-renderer";
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

type Composition = ReturnType<typeof worldExportComposition>;

/** The browser-side renderer, injectable so the logic around it is testable without a browser. */
export type ExportEngine = {
  canRender: typeof canRenderMediaOnWeb;
  stillsAvailable: () => boolean;
  renderMedia: (
    composition: Composition,
    options: { onProgress: (p: number) => void; signal: AbortSignal },
  ) => Promise<Blob>;
  renderStill: (composition: Composition, frame: number, signal: AbortSignal) => Promise<Blob>;
};

const component = { component: WorldStory };

const defaultEngine: ExportEngine = {
  canRender: canRenderMediaOnWeb,
  // Stills are drawn on an OffscreenCanvas and encoded with convertToBlob.
  stillsAvailable: () =>
    typeof OffscreenCanvas !== "undefined" && "convertToBlob" in OffscreenCanvas.prototype,
  renderMedia: async (composition, { onProgress, signal }) => {
    const result = await renderMediaOnWeb({
      composition: { ...composition, ...component },
      inputProps: composition.defaultProps,
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      signal,
      onProgress: (progress) => onProgress(progress.progress),
    });
    return result.getBlob();
  },
  renderStill: async (composition, frame, signal) => {
    const result = await renderStillOnWeb({
      composition: { ...composition, ...component },
      inputProps: composition.defaultProps,
      frame,
      signal,
    });
    return result.blob({ format: "png" });
  },
};

const engineWith = (overrides: Partial<ExportEngine>): ExportEngine => ({
  ...defaultEngine,
  ...overrides,
});

const MP4_REASON =
  "This browser can't make the video. Try a recent Chrome or Edge, or save the slides instead.";
const STILLS_REASON = "This browser can't draw the slides. Try a recent Chrome, Edge or Firefox.";
const NOTHING_REASON = "This browser can't make your files. Try a recent Chrome or Edge.";

/** What this browser can render: an H.264/AAC MP4 at the largest format, and PNG stills. */
export async function exportSupport(overrides: Partial<ExportEngine> = {}): Promise<ExportSupport> {
  const engine = engineWith(overrides);
  // 16:9 and 9:16 share the largest frame; if that encodes, every format does.
  const { width, height } = VIDEO_FORMATS["16x9"];
  let mp4 = false;
  try {
    const result = await engine.canRender({
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      width,
      height,
    });
    mp4 = result.canRender && !result.issues.some((issue) => issue.severity === "error");
  } catch {
    mp4 = false;
  }
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
  options: { onProgress: (p: number) => void; signal: AbortSignal },
  overrides: Partial<ExportEngine> = {},
): Promise<Blob> {
  return engineWith(overrides).renderMedia(worldExportComposition(data, format), options);
}

const aborted = () => new DOMException("The export was cancelled.", "AbortError");

/** One PNG per stop, one at a time: the web renderer is single-threaded and shares the tab. */
export async function renderSlides(
  data: RecapData,
  options: { onProgress: (done: number, total: number) => void; signal: AbortSignal },
  overrides: Partial<ExportEngine> = {},
): Promise<Slide[]> {
  const engine = engineWith(overrides);
  const { onProgress, signal } = options;
  const composition = worldExportComposition(data, "4x5");
  const frames = slideFrames(data);
  const slides: Slide[] = [];
  onProgress(0, frames.length);
  for (const [i, { stopId, frame }] of frames.entries()) {
    if (signal.aborted) throw aborted();
    const blob = await engine.renderStill(composition, frame, signal);
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
