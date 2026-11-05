import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SpriteId } from "../art";
import { beats } from "../audio/track";
import { Sfx } from "./Sfx";
import { Sprite } from "./Sprite";

/**
 * Cell placed in the space a scene leaves empty, springing in at `at` and then looping its baked
 * motion (Sprite, ADR-0013): arms, legs, head and eyes move, with no WebGL in the browser.
 */
export function SpriteAccent({
  sprite,
  at = 0,
  x,
  y,
  size,
  enter = "bottom",
}: {
  sprite: SpriteId;
  at?: number;
  /** Centre as fractions of the frame. */
  x: number;
  y: number;
  /** Width as a fraction of the shorter side. */
  size: number;
  enter?: "right" | "bottom";
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const w = Math.round(Math.min(width, height) * size);
  const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 120, mass: 0.7 } });
  const offset = (1 - p) * w * 0.9;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Sprite
        id={sprite}
        size={w}
        style={{
          position: "absolute",
          left: x * width - w / 2,
          top: y * height - w / 2,
          opacity: Math.min(1, p * 3),
          transform: enter === "right" ? `translateX(${offset}px)` : `translateY(${offset}px)`,
        }}
      />
      {at >= beats(1, fps) && <Sfx at={at} sound="whoosh" volume={0.25} />}
    </AbsoluteFill>
  );
}
