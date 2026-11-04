import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { easeOut, type FieldColor, palette } from "../theme";
import type { TransitionVariant } from "../timeline";
import { Sfx } from "./Sfx";

const easeIn = (t: number) => t ** 3;

/**
 * Opens a scene by taking over from the previous one (DESIGN.md motif), in one beat:
 * - first half: `previous` (that scene frozen on its last frame) moves out while contribution
 *   cells cover it;
 * - second half: the cells clear in the same order and reveal the new scene underneath.
 * It lives at the start of the new scene, not the end of the old one, so a web chapter that
 * stops on its last frame never stops on a half-finished exit.
 *
 * - `sweep`: cells cover in a diagonal wave while the old scene slides toward it; `direction`
 *   picks the side.
 * - `ripple`: cells grow outward from the centre, then clear in the same order.
 * - `zoom`: the old scene rushes forward into one lit cell that fills the frame, then breaks apart.
 */
export function CellTransition({
  variant,
  from,
  seed,
  direction = 1,
  previous,
}: {
  variant: TransitionVariant;
  /** The previous scene's field: the colour of the covering cells. */
  from: FieldColor;
  seed: string;
  direction?: 1 | -1;
  previous: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const duration = beats(1, fps);
  const mid = duration / 2;
  // The sounds outlast the picture (the reveal's patter runs past the last cell), so they stay
  // mounted after the cells are gone.
  const sounds = (
    <>
      <Sfx at={0} sound="whoosh" />
      <Sfx at={Math.floor(mid)} sound="cells" />
    </>
  );
  if (frame >= duration) return sounds;

  const size = Math.min(width, height) / 8;
  const cols = Math.ceil(width / size);
  const rows = Math.ceil(height / size);
  // How long one cell takes to grow or shrink, and how far the wave spreads.
  const cellTime = mid * 0.55;
  const spread = mid - cellTime;
  const exit = Math.min(1, frame / mid);

  const order = (col: number, row: number, index: number): number => {
    if (variant === "sweep") {
      const across = direction === 1 ? col : cols - 1 - col;
      return (across + row) / (cols + rows - 2 || 1);
    }
    const dx = (col + 0.5) / cols - 0.5;
    const dy = ((row + 0.5) / rows - 0.5) * (height / width);
    const distance = Math.hypot(dx, dy) / Math.hypot(0.5, (0.5 * height) / width);
    // A little seeded jitter so the ring doesn't look machine-drawn.
    return Math.min(1, distance * 0.85 + random(`${seed}-${index}`) * 0.15);
  };

  const scaleAt = (delay: number): number => {
    if (variant === "zoom" && frame < mid) return 0;
    const grow =
      variant === "zoom"
        ? 1
        : interpolate(frame, [delay, delay + cellTime], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeOut,
          });
    const shrink = interpolate(frame, [mid + delay, mid + delay + cellTime], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOut,
    });
    return Math.min(grow, shrink);
  };

  // The zoom's cells are the lit cell itself; the others carry the old field with a few greens.
  const cellColor = (index: number): string => {
    if (variant === "zoom") return palette.cell;
    return random(`${seed}-lit-${index}`) < 0.1 ? (palette.heat[1] ?? palette.cell) : palette[from];
  };

  // Dimmed, never faded: transparency would let the new field bleed through and muddy both.
  const dim = `brightness(${1 - 0.35 * exit})`;
  const previousStyle =
    variant === "zoom"
      ? { transform: `scale(${1 + 2 * easeIn(exit)})`, filter: dim }
      : variant === "sweep"
        ? { transform: `translateX(${direction * 12 * easeIn(exit)}%)`, filter: dim }
        : { transform: `scale(${1 - 0.08 * easeIn(exit)})`, filter: dim };

  // The zoom's single cell grows from the centre to cover the frame by the midpoint.
  const zoomCell = variant === "zoom" && frame < mid ? easeIn(exit) : 0;
  const cover = Math.hypot(width, height);

  return (
    <AbsoluteFill>
      {frame < mid && (
        // The old field stays behind the moving scene, so a slide never opens a gap onto the new one.
        <AbsoluteFill style={{ background: palette[from] }}>
          <AbsoluteFill style={previousStyle}>{previous}</AbsoluteFill>
        </AbsoluteFill>
      )}
      {zoomCell > 0 && (
        <div
          style={{
            position: "absolute",
            left: width / 2 - (cover * zoomCell) / 2,
            top: height / 2 - (cover * zoomCell) / 2,
            width: cover * zoomCell,
            height: cover * zoomCell,
            borderRadius: size * 0.14 * (1 - zoomCell),
            background: palette.cell,
          }}
        />
      )}
      {Array.from({ length: cols * rows }, (_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const scale = scaleAt(order(col, row, index) * spread);
        if (scale === 0) return null;
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid, the index is the cell's position
            key={index}
            style={{
              position: "absolute",
              left: col * size,
              top: row * size,
              width: size,
              height: size,
              background: cellColor(index),
              borderRadius: size * 0.14 * (1 - scale),
              // +1% at full size hides seams between neighbouring cells.
              transform: `scale(${scale * 1.01})`,
            }}
          />
        );
      })}
      {sounds}
    </AbsoluteFill>
  );
}
