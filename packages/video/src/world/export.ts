import { type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { buildWorld, type WorldOptions, worldDuration } from "./model";

export type ExportFormat = keyof typeof VIDEO_FORMATS;

/** Slides are the Instagram feed size (4:5), one per stop, letter pages included unless left out. */
const SLIDE_FORMAT = VIDEO_FORMATS["4x5"];

type ExportProps = { data: RecapData; mode: "video"; letter?: boolean };

/**
 * Everything the browser renderer needs for one MP4; the web side attaches the component itself.
 * `letter: false` (a visitor's files, which follow their story) drops the letter's pages from the
 * duration and from the props; by default the props stay `{ data, mode }`, as they always were.
 */
export function worldExportComposition(
  data: RecapData,
  format: ExportFormat,
  options: WorldOptions = {},
) {
  const { width, height } = VIDEO_FORMATS[format];
  const defaultProps: ExportProps =
    options.letter === false ? { data, mode: "video", letter: false } : { data, mode: "video" };
  return {
    id: `world-${format}`,
    width,
    height,
    fps: VIDEO_FPS,
    durationInFrames: worldDuration(data, VIDEO_FORMATS[format], "video", options),
    defaultProps,
  };
}

/** One frame per stop, one frame after arrival: still inside the hold, the stop at rest. */
export function slideFrames(
  data: RecapData,
  options: WorldOptions = {},
): { stopId: string; frame: number }[] {
  const { stops, timeline } = buildWorld(data, SLIDE_FORMAT, "video", VIDEO_FPS, options);
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
