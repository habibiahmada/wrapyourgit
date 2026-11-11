import type { CSSProperties, ReactNode } from "react";
import { type Box, boxPaths, EDGE, paintOrder } from "./iso";

/**
 * An isometric line-art illustration: boxes painted back to front with hairline edges, plus
 * any extra SVG (lines, glows, glyphs) drawn by the caller in screen units. Server-rendered.
 * `rise` gives each box an entrance delay by depth (CSS `.iso-rise`, motion-safe only).
 */
export function IsoArt({
  boxes,
  viewBox,
  label,
  className,
  before,
  after,
  rise = false,
}: {
  boxes: readonly Box[];
  viewBox: string;
  /** Accessible name; omit for decoration (the SVG is then hidden from assistive tech). */
  label?: string;
  className?: string;
  /** Drawn under the boxes (shadows, glows, links). */
  before?: ReactNode;
  /** Drawn over the boxes (glyphs on tops). */
  after?: ReactNode;
  rise?: boolean;
}) {
  const ordered = paintOrder(boxes);
  const deepest = Math.max(1, ...ordered.map((b) => b.at[0] + b.at[1]));
  return (
    <svg
      viewBox={viewBox}
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {before}
      {ordered.map((box, i) => {
        const faces = boxPaths(box);
        const delay = `${Math.round(((box.at[0] + box.at[1]) / deepest) * 600)}ms`;
        return (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: boxes never reorder after the sort
            key={i}
            className={rise ? "iso-rise" : undefined}
            style={rise ? ({ "--delay": delay } as CSSProperties) : undefined}
            stroke={EDGE}
            strokeWidth="0.75"
            strokeLinejoin="round"
          >
            <path d={faces.left} fill={faces.tone.left} vectorEffect="non-scaling-stroke" />
            <path d={faces.right} fill={faces.tone.right} vectorEffect="non-scaling-stroke" />
            <path d={faces.top} fill={faces.tone.top} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
      {after}
    </svg>
  );
}
