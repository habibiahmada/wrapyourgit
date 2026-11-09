import type { ReactNode } from "react";
import { Img, staticFile, useVideoConfig } from "remotion";
import { type CellPose, HEAD_ART_ID } from "../../art";
import { fitFontSize } from "../../heat";
import { fontFamily, palette } from "../../theme";

/** Scenes draw in a space 1000 units wide; this is its height for a frame of the given size. */
export const SCENE_WIDTH = 1000;
export function sceneHeight(size: { width: number; height: number }): number {
  return (SCENE_WIDTH * size.height) / size.width;
}

/** Pixels per scene unit, for HTML layers (the art) that sit over a SceneSvg. */
function useUnitPx(): number {
  return useVideoConfig().width / SCENE_WIDTH;
}

/**
 * The frame as an SVG 1000 units wide and `sceneHeight` tall, so one unit is the same on both
 * axes in every format. Later siblings (CellArt, HeadArt) draw over it: DOM order, no z-index.
 */
export function SceneSvg({ children }: { children?: ReactNode }) {
  const { width, height } = useVideoConfig();
  const h = sceneHeight({ width, height });
  return (
    <svg
      viewBox={`0 0 ${SCENE_WIDTH} ${h}`}
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0 }}
      role="presentation"
    >
      {children}
    </svg>
  );
}

/**
 * One line of text in scene units, shrunk to fit `maxWidth` (never wider). `y` is the baseline.
 * Must sit inside a SceneSvg.
 */
export function Label({
  x,
  y,
  text,
  size,
  weight = 700,
  anchor = "start",
  maxWidth = SCENE_WIDTH,
  fill = palette.ink,
}: {
  x: number;
  y: number;
  text: string;
  /** Largest font size, in scene units. */
  size: number;
  weight?: 400 | 700 | 800;
  anchor?: "start" | "middle" | "end";
  maxWidth?: number;
  fill?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontFamily={fontFamily}
      fontSize={fitFontSize(text, maxWidth, size)}
      fontWeight={weight}
      textAnchor={anchor}
    >
      {text}
    </text>
  );
}

/**
 * Cell's baked still for a pose (1200×900 cutout), `width` scene units wide, standing on (x, y):
 * x is its horizontal centre, y its bottom edge.
 */
export function CellArt({
  pose,
  x,
  y,
  width,
}: {
  pose: CellPose;
  x: number;
  y: number;
  width: number;
}) {
  const px = useUnitPx();
  const height = width * 0.75;
  return (
    <Img
      src={staticFile(`art/cutout-cell-${pose}.png`)}
      alt=""
      style={{
        position: "absolute",
        left: (x - width / 2) * px,
        top: (y - height) * px,
        width: width * px,
        height: height * px,
      }}
    />
  );
}

/** Cell's head (600×600 still), `size` scene units square, centred on (x, y). */
export function HeadArt({ x, y, size }: { x: number; y: number; size: number }) {
  const px = useUnitPx();
  return (
    <Img
      src={staticFile(`art/${HEAD_ART_ID}.png`)}
      alt=""
      style={{
        position: "absolute",
        left: (x - size / 2) * px,
        top: (y - size / 2) * px,
        width: size * px,
        height: size * px,
      }}
    />
  );
}
