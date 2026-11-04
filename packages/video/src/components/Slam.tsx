import type { CSSProperties, ReactNode } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Kinetic entrance: content rises from behind a clipping line at frame `at` with a short,
 * stiff spring, so it lands on the beat instead of floating in.
 */
export function Slam({
  at,
  children,
  style,
  from = "below",
}: {
  at: number;
  children: ReactNode;
  style?: CSSProperties;
  from?: "below" | "left";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - at,
    fps,
    config: { damping: 20, stiffness: 220, mass: 0.6 },
  });
  const offset = (1 - progress) * 110;
  const transform = from === "below" ? `translateY(${offset}%)` : `translateX(${-offset}%)`;

  return (
    // Padding/negative margin keep descenders (g, y) inside the clip without shifting layout.
    <div style={{ overflow: "hidden", paddingBottom: "0.14em", marginBottom: "-0.14em", ...style }}>
      <div style={{ transform }}>{children}</div>
    </div>
  );
}
