/** The composition's short side: what the export formats use too, so text sizes match. */
const SHORT = 1080;
/** Wider or taller than this and the story would be a strip; the rest is cropped at the edges. */
const MAX_RATIO = 21 / 9;
/** Steps of the long side, so a resize of a few pixels seldom rebuilds the ride. */
const STEP = 8;

/**
 * The composition size for a window: the window's own shape, short side 1080, so the story fills
 * the screen with no bands. Every scene sizes itself from width and height, so any shape works.
 */
export function stageSize(
  viewWidth: number,
  viewHeight: number,
): { width: number; height: number } {
  if (viewWidth <= 0 || viewHeight <= 0) return { width: SHORT, height: 1920 };
  const ratio = Math.min(
    Math.max(viewWidth, viewHeight) / Math.min(viewWidth, viewHeight),
    MAX_RATIO,
  );
  const long = Math.max(SHORT, Math.round((SHORT * ratio) / STEP) * STEP);
  return viewWidth >= viewHeight ? { width: long, height: SHORT } : { width: SHORT, height: long };
}
