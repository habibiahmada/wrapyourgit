/**
 * A baked animation of Cell (packages/video/src/art.ts, ADR-0013): a looping animated WebP, with
 * no WebGL in the page. Under reduced motion the browser picks the still of the same art instead.
 * Every file also comes as AVIF (scripts/art-avif.ts), about a fifth of the WebP loop and half the
 * still, listed first so browsers that read it fetch the lighter file; the rest keep WebP and PNG.
 * Plain <picture>/<img>: next/image does not resize animated images anyway, and the source switch
 * on `prefers-reduced-motion` needs <picture>.
 *
 * A city block (`skin-*`, `iso-*`) is two layers (ADR-0022): a still of the block, and over it a
 * loop of only Cell, the one thing in it that moves on a page. A loop of the whole block weighed
 * about a megabyte; the two layers weigh about a quarter of that. Both are the same size on the
 * page, so the loop lies exactly over the plaza it was cut from.
 */
export function Art({
  id,
  alt,
  className,
  priority = false,
  width = 1200,
  height = 900,
}: {
  /** Art id, e.g. "cutout-cell-wave", "skin-builder", "iso-letter", "head-cell". */
  id: string;
  /** Empty for decoration. */
  alt: string;
  className?: string;
  /** Above the fold: load eagerly at high priority. */
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  const layered = id.startsWith("skin-") || id.startsWith("iso-");
  if (!layered) {
    return (
      <picture>
        <source
          srcSet={`/art/${id}-still.avif`}
          type="image/avif"
          media="(prefers-reduced-motion: reduce)"
        />
        <source srcSet={`/art/${id}.png`} media="(prefers-reduced-motion: reduce)" />
        <source srcSet={`/art/${id}.avif`} type="image/avif" />
        <img
          src={`/art/${id}.webp`}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          draggable={false}
          className={className}
        />
      </picture>
    );
  }
  return (
    <span className={`relative block ${className ?? ""}`}>
      <picture>
        {/* The whole picture, still, Cell included. */}
        <source
          srcSet={`/art/${id}-still.avif`}
          type="image/avif"
          media="(prefers-reduced-motion: reduce)"
        />
        <source srcSet={`/art/${id}.png`} media="(prefers-reduced-motion: reduce)" />
        <source srcSet={`/art/${id}-base.avif`} type="image/avif" />
        <img
          src={`/art/${id}-base.webp`}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          draggable={false}
          className="block h-auto w-full"
        />
      </picture>
      {/* Cell, moving. Not shown under reduced motion, where the still above already has it. */}
      <picture>
        <source srcSet={`/art/${id}.avif`} type="image/avif" />
        <img
          src={`/art/${id}.webp`}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full motion-reduce:hidden"
        />
      </picture>
    </span>
  );
}
