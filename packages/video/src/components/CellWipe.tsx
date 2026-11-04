import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { easeOut, type FieldColor, palette } from "../theme";

/**
 * Opens a scene: the previous scene's color, cut into contribution-sized cells, shrinks away in
 * a seeded order to reveal the new field (DESIGN.md motif). Fully gone after one beat.
 */
export function CellWipe({ from, seed }: { from: FieldColor; seed: string }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const duration = beats(1, fps);
  if (frame >= duration) return null;

  const size = Math.min(width, height) / 8;
  const cols = Math.ceil(width / size);
  const rows = Math.ceil(height / size);
  const spread = duration * 0.5;

  return (
    <AbsoluteFill>
      {Array.from({ length: cols * rows }, (_, index) => {
        const delay = random(`${seed}-${index}`) * spread;
        const scale = interpolate(frame, [delay, delay + duration - spread], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easeOut,
        });
        if (scale === 0) return null;
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid, the index is the cell's position
            key={index}
            style={{
              position: "absolute",
              left: (index % cols) * size,
              top: Math.floor(index / cols) * size,
              width: size,
              height: size,
              background: palette[from],
              // +1px overlap at full size hides seams between neighbouring cells.
              transform: `scale(${scale * 1.01})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
