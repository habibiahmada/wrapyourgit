import { type RecapData, recapDataSchema, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { z } from "zod";
import { fileSlug } from "./file-name";
import { buildRide, type RideOptions, rideDuration } from "./ride/model";

export { cardFileName } from "./file-name";

export type ExportFormat = keyof typeof VIDEO_FORMATS;

/** Slides are one per stop, letter pages included unless left out; by default the Instagram feed size (4:5). */
const SLIDE_FORMAT: ExportFormat = "4x5";

/**
 * The props an export renders with, as a schema the browser renderer checks them against before
 * the first frame (#227): a malformed recap fails at once, naming the field, instead of minutes
 * into a render or as a finished file with wrong numbers. `progress: false` for stills: a slide
 * leaves the stops' progress bar out (#197).
 */
export const exportPropsSchema = z.object({
  data: recapDataSchema,
  mode: z.literal("video"),
  letter: z.boolean().optional(),
  progress: z.boolean().optional(),
});

type ExportProps = { data: RecapData; mode: "video"; letter?: boolean; progress?: boolean };

/**
 * Everything the browser renderer needs for one MP4; the web side attaches the component itself.
 * `letter: false` (a visitor's files, which follow their story) drops the letter's pages from the
 * duration and from the props; by default the props stay `{ data, mode }`, as they always were.
 */
export function worldExportComposition(
  data: RecapData,
  format: ExportFormat,
  options: RideOptions = {},
) {
  const { width, height } = VIDEO_FORMATS[format];
  const defaultProps: ExportProps =
    options.letter === false ? { data, mode: "video", letter: false } : { data, mode: "video" };
  return {
    id: `ride-${format}`,
    width,
    height,
    fps: VIDEO_FPS,
    durationInFrames: rideDuration(data, VIDEO_FORMATS[format], "video", options),
    defaultProps,
  };
}

/**
 * One frame per stop, the stop's own frame: the first frame of its rest, where the camera has
 * settled and every printed figure has finished counting up to its exact value.
 */
export function slideFrames(
  data: RecapData,
  { format = SLIDE_FORMAT, ...options }: RideOptions & { format?: ExportFormat } = {},
): { stopId: string; frame: number }[] {
  // Each shape has its own ride: the letter's page count and the timeline follow the frame.
  const { stops, timeline } = buildRide(data, VIDEO_FORMATS[format], "video", VIDEO_FPS, options);
  return stops.flatMap((stop, i) => {
    const rest = timeline.stopFrames[i];
    return rest === undefined ? [] : [{ stopId: stop.id, frame: rest }];
  });
}

export function exportFileName(
  kind: "mp4" | "png" | "zip" | "pdf",
  data: RecapData,
  extra: { format?: ExportFormat; index?: number; stopId?: string } = {},
): string {
  const base = `wrapyourgit-${data.meta.year}-${fileSlug(data.profile.login)}`;
  switch (kind) {
    case "mp4":
      return `${base}-${extra.format ?? "9x16"}.mp4`;
    case "png":
      return `${base}-${String(extra.index ?? 1).padStart(2, "0")}-${extra.stopId ?? "slide"}.png`;
    case "zip":
      return extra.format ? `${base}-slides-${extra.format}.zip` : `${base}-slides.zip`;
    case "pdf":
      return extra.format ? `${base}-${extra.format}.pdf` : `${base}.pdf`;
  }
}
