import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/*
 * A baked 3D cutout (public/art/cutout-*.png) placed in a scene: peeking in from an edge, sitting
 * in a corner, or as a faint silhouette behind the text. Each scene uses it differently, so the
 * illustrations vary instead of repeating one diorama. Always drawn behind the scene's text.
 */

type Enter = "right" | "left" | "bottom" | "fade";

export function Accent({
  art,
  at = 0,
  x,
  y,
  size,
  rotate = 0,
  enter = "fade",
  silhouette,
  opacity = 1,
  flip = false,
}: {
  /** Cutout id, e.g. "cutout-cell-cheer". */
  art: string;
  /** Frame at which it starts entering. */
  at?: number;
  /** Centre position as fractions of the frame (can be past 0..1 to peek in from an edge). */
  x: number;
  y: number;
  /** Width as a fraction of the shorter side. */
  size: number;
  rotate?: number;
  enter?: Enter;
  /**
   * Flatten to a silhouette: "dark" (ink) on light fields, "light" (paper) on dark ones. Done
   * with a filter on <Img>, which Remotion waits for; a CSS mask image would not be awaited.
   */
  silhouette?: "dark" | "light";
  opacity?: number;
  flip?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const w = unit * size;
  const h = w * 0.75; // cutouts are 4:3
  const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 120, mass: 0.7 } });
  const offset = (1 - p) * w * 0.9;
  const dx = enter === "right" ? offset : enter === "left" ? -offset : 0;
  const dy = enter === "bottom" ? offset : 0;
  const shown = enter === "fade" ? interpolate(p, [0, 1], [0, 1]) : Math.min(1, p * 3);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x * width - w / 2,
          top: y * height - h / 2,
          width: w,
          height: h,
          opacity: shown * opacity,
          transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg) scaleX(${flip ? -1 : 1})`,
        }}
      >
        <Img
          src={staticFile(`art/${art}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            // A silhouette keeps the shape and drops the detail, so it reads as background.
            filter:
              silhouette === "dark"
                ? "brightness(0)"
                : silhouette === "light"
                  ? "brightness(0) invert(1)"
                  : undefined,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
