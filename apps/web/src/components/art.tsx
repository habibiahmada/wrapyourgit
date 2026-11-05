/**
 * A baked animation of Cell (packages/video/src/art.ts, ADR-0013): a looping animated WebP, with
 * no WebGL in the page. Under reduced motion the browser picks the still PNG of the same art
 * instead. Plain <picture>/<img>: next/image does not resize animated images anyway, and the
 * source switch on `prefers-reduced-motion` needs <picture>.
 */
export function Art({
  id,
  alt,
  className,
  priority = false,
  width = 1200,
  height = 900,
}: {
  /** Art id, e.g. "cutout-cell-wave", "skin-builder", "hero-cast", "head-cell". */
  id: string;
  /** Empty for decoration. */
  alt: string;
  className?: string;
  /** Above the fold: load eagerly at high priority. */
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <picture>
      <source srcSet={`/art/${id}.png`} media="(prefers-reduced-motion: reduce)" />
      <img
        src={`/art/${id}.webp`}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
