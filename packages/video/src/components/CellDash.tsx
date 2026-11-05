import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { useLayout } from "../layout";
import { palette } from "../theme";
import { Sprite } from "./Sprite";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type DashStyle = {
  /** Which way Cell crosses the frame. */
  dir: "left" | "right";
  /** Bounce across in hops instead of running flat. */
  hop?: boolean;
};

/** How long the crossing takes. */
export const DASH_BEATS = 3;

/**
 * Cell running sideways across the frame at a cut, so the story feels like one character
 * travelling from chapter to chapter. It leaves a trail of contribution cells that light up and
 * fade. A baked side-on loop (Sprite, ADR-0013), mirrored for leftward runs, on top of the scene
 * for the first DASH_BEATS beats only; the chapter's last frame, where slides are taken, never
 * shows it.
 */
export function CellDash({ dash }: { dash: DashStyle }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const layout = useLayout();
  const duration = beats(DASH_BEATS, fps);
  if (frame >= duration) return null;

  const unit = Math.min(width, height) / 100;
  const box = unit * (layout === "landscape" ? 38 : 34);
  const ground = height * (layout === "portrait" ? 0.84 : layout === "compact" ? 0.83 : 0.8);
  const p = frame / duration;
  // Speeds up out of the cut, eases as it leaves.
  const travel = interpolate(p, [0, 1], [0, 1], clamp);
  const eased = travel < 0.5 ? 2 * travel ** 2 : 1 - (-2 * travel + 2) ** 2 / 2;
  const start = -box * 0.6;
  const end = width + box * 0.6;
  const progress = dash.dir === "right" ? eased : 1 - eased;
  const x = start + (end - start) * progress;
  const t = frame / fps;
  const hop = dash.hop ? Math.abs(Math.sin((t * Math.PI * 4) / 1)) * box * 0.28 : 0;

  // Trail: cells dropped where Cell has passed, popping in, then fading out.
  const trail = Array.from({ length: 9 }, (_, i) => {
    const at = (i + 0.5) / 9;
    const passed = dash.dir === "right" ? progress - at : at - progress;
    if (passed <= 0) return null;
    const age = passed / 0.35;
    const scale = Math.min(1, age * 3);
    const opacity = interpolate(age, [0, 0.2, 1, 1.6], [0, 1, 1, 0], clamp);
    if (opacity <= 0) return null;
    const size = unit * (2.4 + (i % 3) * 0.9);
    return (
      <div
        key={at}
        style={{
          position: "absolute",
          left: start + (end - start) * at - size / 2,
          top: ground - size * (0.6 + (i % 2) * 0.9),
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: palette.heat[i % 4],
          opacity,
          transform: `scale(${scale})`,
        }}
      />
    );
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {trail}
      <div
        style={{
          position: "absolute",
          left: x - box / 2,
          top: ground - box * 0.86 - hop,
          width: box,
          height: box,
        }}
      >
        {/* Side sprites face right; mirror them to run left. */}
        <Sprite id={dash.hop ? "hop-side" : "run-side"} size={box} flip={dash.dir === "left"} />
      </div>
    </AbsoluteFill>
  );
}
