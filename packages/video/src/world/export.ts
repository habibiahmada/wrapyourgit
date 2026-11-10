import { type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { buildWorld, worldDuration } from "./model";

export type ExportFormat = keyof typeof VIDEO_FORMATS;

/** Slides are the Instagram feed size (4:5), one per stop, letter pages included. */
const SLIDE_FORMAT = VIDEO_FORMATS["4x5"];

/** Everything the browser renderer needs for one MP4; the web side attaches the component itself. */
export function worldExportComposition(data: RecapData, format: ExportFormat) {
  const { width, height } = VIDEO_FORMATS[format];
  return {
    id: `world-${format}`,
    width,
    height,
    fps: VIDEO_FPS,
    durationInFrames: worldDuration(data, VIDEO_FORMATS[format], "video"),
    defaultProps: { data, mode: "video" as const },
  };
}

/** One frame per stop, one frame after arrival: still inside the hold, the stop at rest. */
export function slideFrames(data: RecapData): { stopId: string; frame: number }[] {
  const { stops, timeline } = buildWorld(data, SLIDE_FORMAT, "video", VIDEO_FPS);
  return stops.flatMap((stop, i) => {
    const arrival = timeline.stopFrames[i];
    return arrival === undefined ? [] : [{ stopId: stop.id, frame: arrival + 1 }];
  });
}

const slug = (login: string) => login.toLowerCase().replace(/[^a-z0-9-]/g, "-");

export function exportFileName(
  kind: "mp4" | "png" | "zip" | "pdf",
  data: RecapData,
  extra: { format?: ExportFormat; index?: number; stopId?: string } = {},
): string {
  const base = `wrapyourgit-${data.meta.year}-${slug(data.profile.login)}`;
  switch (kind) {
    case "mp4":
      return `${base}-${extra.format ?? "9x16"}.mp4`;
    case "png":
      return `${base}-${String(extra.index ?? 1).padStart(2, "0")}-${extra.stopId ?? "slide"}.png`;
    case "zip":
      return `${base}-slides.zip`;
    case "pdf":
      return `${base}.pdf`;
  }
}
