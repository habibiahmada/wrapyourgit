import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { Img, staticFile, useVideoConfig } from "remotion";
import { type CellPose, HEAD_ART_ID } from "../../art";
import { fontFamily, palette } from "../../theme";
import {
  type LabelAnchor,
  type LabelWeight,
  labelFontSize,
  labelRoom,
  SCENE_WIDTH,
  sceneHeight,
} from "./fit";

export {
  type LabelAnchor,
  type LabelWeight,
  labelFontSize,
  labelRoom,
  labelWidth,
  SCENE_WIDTH,
  safeArea,
  sceneHeight,
} from "./fit";

/** Height over width of the baked stills (scripts/render-art.ts): cutouts 1200×900, head 600×600. */
const CUTOUT_ASPECT = 3 / 4;
const HEAD_ASPECT = 1;

/** Pixels per scene unit, for HTML layers (the art) that sit over a SceneSvg. */
function useUnitPx(): number {
  return useVideoConfig().width / SCENE_WIDTH;
}

/**
 * The frame as an SVG 1000 units wide and `sceneHeight` tall, so one unit is the same on both
 * axes in every format. Later siblings (CellArt, HeadArt) draw over it: DOM order, no z-index.
 * `title` names the picture for assistive tech; the scene's own text stays in the tree too.
 */
export function SceneSvg({ title, children }: { title: string; children?: ReactNode }) {
  const { width, height } = useVideoConfig();
  const h = sceneHeight({ width, height });
  return (
    <svg
      viewBox={`0 0 ${SCENE_WIDTH} ${h}`}
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/**
 * One line of text in scene units, shrunk until it fits both the scene (from x and the anchor) and
 * `maxWidth` when given. `y` is the baseline. Must sit inside a SceneSvg.
 */
export function Label({
  x,
  y,
  text,
  size,
  weight = 700,
  anchor = "start",
  maxWidth,
  fill = palette.ink,
}: {
  x: number;
  y: number;
  text: string;
  /** Largest font size, in scene units. */
  size: number;
  weight?: LabelWeight;
  anchor?: LabelAnchor;
  maxWidth?: number;
  fill?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontFamily={fontFamily}
      fontSize={labelFontSize(text, size, weight, labelRoom(x, anchor, maxWidth))}
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
  const height = width * CUTOUT_ASPECT;
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
        top: (y - (size * HEAD_ASPECT) / 2) * px,
        width: size * px,
        height: size * HEAD_ASPECT * px,
      }}
    />
  );
}

/** Cell in an archetype's costume (`cutout-<id>`, same 1200×900 frame as the poses), standing on (x, y). */
export function ArchetypeArt({
  id,
  x,
  y,
  width,
}: {
  id: ArchetypeId;
  x: number;
  y: number;
  width: number;
}) {
  const px = useUnitPx();
  const height = width * CUTOUT_ASPECT;
  return (
    <Img
      src={staticFile(`art/cutout-${id}.png`)}
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
