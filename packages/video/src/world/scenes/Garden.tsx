import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, palette } from "../../theme";
import { gardenModel } from "./garden.model";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import type { SceneProps } from "./types";

const MARGIN = 30;
const SKY = "#DDF3E1";
const SOIL = "#6E5236";
const BARK = "#8A5A33";
/** Trunk height as a share of the crown's radius; a trunk wide enough to read as one. */
const TRUNK_H = 0.45;
const TRUNK_W = 0.2;
/** Below this slot width the signs go on two staggered rows so neighbours never touch. */
const STAGGER_BELOW = 215;

export function Garden({ data, size, enter, frame }: SceneProps) {
  const model = gardenModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const n = model.trees.length;
  const titleSize = Math.min(72, h * 0.07);
  const captionSize = Math.min(34, h * 0.04);
  const titleY = safe.top + titleSize;
  const captionY = h - safe.bottom;
  const noteY = captionY - captionSize * 1.5;
  const bottomLimit = (model.otherNote ? noteY : captionY) - captionSize - 24;
  const topLimit = titleY + 36;

  const font = Math.max(22, Math.min(32, h * 0.04));
  const signH = font * 2.7;
  const width = 1000 - 2 * MARGIN;
  const slots = Math.max(n, 1);
  // Cell takes one slot's room beside the largest tree (the first, trees come sorted by share).
  const cellW = Math.min((width / (slots + 1)) * 1.1, 300, h * 0.4);
  const slotW = (width - cellW) / slots;
  const stagger = n > 1 && slotW < STAGGER_BELOW;
  const signZone = (stagger ? 2 * signH + 16 : signH) + 40;

  const centers = model.trees.map((_, i) =>
    i === 0 ? MARGIN + slotW / 2 : MARGIN + cellW + slotW * (i + 0.5),
  );
  // Largest crown scale (units per 1.0 of radius) that keeps neighbours apart and fits the height.
  let scale = Infinity;
  for (let i = 0; i + 1 < n; i++) {
    const a = model.trees[i];
    const b = model.trees[i + 1];
    const ca = centers[i];
    const cb = centers[i + 1];
    if (a && b && ca !== undefined && cb !== undefined)
      scale = Math.min(scale, (1.04 * (cb - ca)) / (a.radius + b.radius));
  }
  const rMax = model.trees[0]?.radius ?? 1;
  const free = bottomLimit - topLimit - signZone;
  scale = Math.min(
    scale,
    (slotW * 0.5) / rMax / 1.0 + (n === 1 ? slotW * 0.5 : 0),
    free / ((2 + TRUNK_H) * rMax),
  );
  if (!Number.isFinite(scale) || scale <= 0) scale = 100;
  const treeH = (2 + TRUNK_H) * rMax * scale;
  const groupH = (n > 0 ? treeH : 0) + signZone;
  const top = topLimit + Math.max(0, (bottomLimit - topLimit - groupH) / 2);
  const groundY = top + (n > 0 ? treeH : Math.max(0, free * 0.5));
  const cellX = n > 0 ? MARGIN + slotW + cellW / 2 : 500;
  const bob = Math.sin(frame / 14) * 3;
  const signW = stagger ? Math.min(2 * slotW - 12, 260) : Math.min(slotW - 12, 260);

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <SceneSvg
        title={`${model.title}. ${
          model.empty
            ? model.caption
            : `${model.trees.map((tr) => `${tr.name} ${tr.label}`).join(", ")}. ${model.caption}`
        }`}
      >
        <Label
          x={500}
          y={titleY}
          text={model.title}
          size={titleSize}
          weight={800}
          anchor="middle"
        />
        <rect x={0} y={groundY} width={1000} height={h - groundY} fill={SOIL} />
        <rect x={0} y={groundY} width={1000} height={14} fill={palette.heat[1]} />
        <rect x={0} y={groundY + 14} width={1000} height={3} fill={palette.ink} />
        {model.trees.map((tree, i) => {
          const cx = centers[i] ?? 500;
          const r = tree.radius * scale;
          const trunkH = r * TRUNK_H;
          const grow = easeOut(Math.min(1, Math.max(0, t * 1.5 - i * 0.15)));
          const sway = Math.sin(frame / 30 + i * 1.7) * 1.6;
          const trunkW = Math.max(12, r * TRUNK_W);
          const row = stagger && i % 2 === 1 ? 1 : 0;
          const signTop = groundY + 36 + row * (signH + 16);
          // Keep the board inside the scene when its tree stands near an edge; the stake stays put.
          const signX = Math.min(1000 - 8 - signW, Math.max(8, cx - signW / 2));
          return (
            <g key={tree.name}>
              <g transform={`translate(${cx} ${groundY}) rotate(${sway}) scale(${grow})`}>
                <rect
                  x={-trunkW / 2}
                  y={-trunkH - 4}
                  width={trunkW}
                  height={trunkH + 4}
                  fill={BARK}
                  stroke={palette.ink}
                  strokeWidth={4}
                />
                <circle
                  cx={0}
                  cy={-trunkH - r}
                  r={r}
                  fill={tree.color}
                  stroke={palette.ink}
                  strokeWidth={5}
                />
                <ellipse
                  cx={-r * 0.35}
                  cy={-trunkH - r * 1.35}
                  rx={r * 0.28}
                  ry={r * 0.16}
                  fill={palette.paper}
                  opacity={0.35}
                />
              </g>
              <g opacity={grow}>
                <rect
                  x={cx - 3}
                  y={groundY + 10}
                  width={6}
                  height={signTop - groundY - 8}
                  fill={palette.ink}
                />
                <rect
                  x={signX}
                  y={signTop}
                  width={signW}
                  height={signH}
                  rx={8}
                  fill={palette.paper}
                  stroke={palette.ink}
                  strokeWidth={3}
                />
                <Label
                  x={signX + signW / 2}
                  y={signTop + signH * 0.45}
                  text={tree.name}
                  size={font}
                  weight={800}
                  anchor="middle"
                  maxWidth={signW - 16}
                />
                <Label
                  x={signX + signW / 2}
                  y={signTop + signH * 0.85}
                  text={tree.label}
                  size={font}
                  weight={700}
                  anchor="middle"
                  maxWidth={signW - 16}
                />
              </g>
            </g>
          );
        })}
        {model.otherNote && (
          <Label
            x={500}
            y={noteY}
            text={model.otherNote}
            size={captionSize}
            weight={800}
            anchor="middle"
            fill={palette.paper}
          />
        )}
        <Label
          x={500}
          y={captionY}
          text={model.caption}
          size={captionSize}
          weight={700}
          anchor="middle"
          fill={palette.paper}
        />
      </SceneSvg>
      <CellArt pose="think" x={cellX} y={groundY + 10 + bob * t} width={cellW} />
    </AbsoluteFill>
  );
}
