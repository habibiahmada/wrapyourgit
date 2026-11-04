/**
 * Export formats. Four aspect ratios map onto three layout families;
 * scenes are written per layout family, not per ratio (ADR-0003).
 */
export type LayoutFamily = "portrait" | "compact" | "landscape";

export const VIDEO_FORMATS = {
  "9x16": { width: 1080, height: 1920, layout: "portrait", label: "Reels, TikTok, Shorts" },
  "4x5": { width: 1080, height: 1350, layout: "compact", label: "Instagram feed" },
  "1x1": { width: 1080, height: 1080, layout: "compact", label: "Instagram, LinkedIn" },
  "16x9": { width: 1920, height: 1080, layout: "landscape", label: "YouTube, desktop" },
} as const satisfies Record<
  string,
  { width: number; height: number; layout: LayoutFamily; label: string }
>;

export type VideoFormatId = keyof typeof VIDEO_FORMATS;

export const VIDEO_FPS = 30;

/** Pick a layout family for an arbitrary viewport (used by the live web story). */
export function layoutForSize(width: number, height: number): LayoutFamily {
  const ratio = width / height;
  if (ratio < 0.7) return "portrait";
  if (ratio > 1.3) return "landscape";
  return "compact";
}
