import type { CSSProperties } from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SPRITE_SHEET, type SpriteId, spriteFrame } from "../art";

/**
 * One frame of a baked sprite sheet (art.ts, ADR-0013), chosen from the current frame: the
 * story's characters move without WebGL, and a given frame always shows the same pose, so the
 * MP4, the slides and the web Player agree. Remotion's Img waits for the sheet before capturing.
 */
export function Sprite({
  id,
  size,
  flip = false,
  style,
}: {
  id: SpriteId;
  /** Width and height of the square frame, px. */
  size: number;
  /** Mirror it: side sprites face right. */
  flip?: boolean;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { cols, rows } = SPRITE_SHEET;
  const index = spriteFrame(frame, fps);
  const col = index % cols;
  const row = Math.floor(index / cols);
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        overflow: "hidden",
        transform: flip ? "scaleX(-1)" : undefined,
        ...style,
      }}
    >
      <Img
        src={staticFile(`sprites/${id}.webp`)}
        style={{
          position: "absolute",
          left: -col * size,
          top: -row * size,
          width: cols * size,
          height: rows * size,
          maxWidth: "none",
        }}
      />
    </div>
  );
}
