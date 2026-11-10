import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, palette } from "../../theme";
import { type GardenTree, gardenModel } from "./garden.model";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import type { SceneProps } from "./types";

const MARGIN = 30;
const SKY = "#DDF3E1";
const SOIL = "#6E5236";
const BARK = "#8A5A33";
/** Trunk height over the crown's radius, and the whole tree's height (trunk + puffed crown). */
const TRUNK_H = 0.5;
const TREE_H = TRUNK_H + 1.64;
/** Landscape signs go on two staggered rows when their slot is narrower than this. */
const STAGGER_BELOW = 215;
const ROW_GAP = 36;

/** Four overlapping lobes inside a circle of radius 1: reads as a leafy crown, not a lollipop. */
const LOBES = [
  { x: 0, y: 0, r: 0.72 },
  { x: -0.5, y: 0.2, r: 0.5 },
  { x: 0.5, y: 0.2, r: 0.5 },
  { x: 0.05, y: -0.42, r: 0.5 },
];

type Slot = { tree: GardenTree; cx: number; row: number };

export function Garden({ data, size, layout, enter, frame }: SceneProps) {
  const model = gardenModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const tall = layout !== "landscape";
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const n = model.trees.length;
  const titleSize = Math.min(72, h * 0.07);
  const captionSize = Math.min(34, h * 0.04);
  const titleY = safe.top + titleSize;
  const captionY = h - safe.bottom;
  const noteY = captionY - captionSize * 1.5;
  const bottomLimit = (model.otherNote ? noteY : captionY) - captionSize - 24;
  const topLimit = titleY + 36;

  const font = Math.max(22, Math.min(tall ? 46 : 32, h * (tall ? 0.026 : 0.04)));
  const signH = font * 2.7;
  const width = 1000 - 2 * MARGIN;

  // Tall frames: two rows, each its own lawn, the largest trees and Cell on the first. Landscape: one.
  const rows = tall && n >= 2 ? 2 : 1;
  const firstRow = rows === 1 ? n : Math.floor(n / 2);
  const rowA = model.trees.slice(0, firstRow);
  const rowB = model.trees.slice(firstRow);
  const slots = Math.max(rowA.length + 1, rowB.length, 2);
  const slotW = width / slots;
  const cellW = Math.min(slotW * 0.95, 320, h * 0.4);
  const stagger = !tall && n > 1 && slotW < STAGGER_BELOW;
  const signZone = (stagger ? 2 * signH + 16 : signH) + 40;
  const placed: Slot[] = [
    ...rowA.map((tree, i) => ({
      tree,
      row: 0,
      cx: MARGIN + slotW * (i === 0 ? 0.5 : i + 1.5),
    })),
    ...rowB.map((tree, i) => ({
      tree,
      row: 1,
      cx: 500 - (rowB.length * slotW) / 2 + slotW * (i + 0.5),
    })),
  ];
  const rMaxOf = (row: number) => placed.find((p) => p.row === row)?.tree.radius ?? 0;

  // Largest crown scale (scene units per 1.0 of radius): neighbours in a row stay apart, no crown
  // is wider than half a slot, and the rows plus their signs fit the free height.
  let scale = Infinity;
  for (const a of placed) {
    scale = Math.min(scale, (slotW * 0.5) / a.tree.radius);
    for (const b of placed) {
      if (b.row === a.row && b.cx > a.cx)
        scale = Math.min(scale, (1.04 * (b.cx - a.cx)) / (a.tree.radius + b.tree.radius));
    }
  }
  const rowsR = rows === 2 ? rMaxOf(0) + rMaxOf(1) : rMaxOf(0);
  const fixed = rows * signZone + (rows - 1) * ROW_GAP;
  scale = Math.min(scale, (bottomLimit - topLimit - fixed) / (TREE_H * Math.max(rowsR, 0.01)));
  if (!Number.isFinite(scale) || scale <= 0) scale = 100;

  const heightA = TREE_H * rMaxOf(0) * scale;
  const heightB = rows === 2 ? TREE_H * rMaxOf(1) * scale : 0;
  const groupH = n > 0 ? heightA + heightB + fixed : 0;
  const top = topLimit + Math.max(0, (bottomLimit - topLimit - groupH) / 2);
  const groundA = n > 0 ? top + heightA : topLimit + (bottomLimit - topLimit) * 0.6;
  const groundB = groundA + signZone + ROW_GAP + heightB;
  const grounds = [groundA, groundB];
  const cellX = MARGIN + slotW * 1.5;
  const bob = Math.sin(frame / 14) * 3;
  const cellH = cellW * 0.75;
  // The can sits at Cell's side nearest the largest tree and tips toward it.
  const can = cellW * 0.3;
  const canX = cellX - cellW * 0.42;
  const canY = groundA - cellH * 0.42 + bob * t;
  const tilt = -24 - Math.sin(frame / 20) * 4;

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
        <rect x={0} y={groundA} width={1000} height={h - groundA} fill={SOIL} />
        {Array.from({ length: rows }, (_, k) => k).map((k) => (
          <g key={k}>
            <rect x={0} y={grounds[k]} width={1000} height={14} fill={palette.heat[1]} />
            <rect x={0} y={(grounds[k] ?? 0) + 14} width={1000} height={3} fill={palette.ink} />
          </g>
        ))}
        {placed.map(({ tree, cx, row }, i) => {
          const ground = grounds[row] ?? groundA;
          const r = tree.radius * scale;
          const trunkH = r * TRUNK_H;
          const grow = easeOut(Math.min(1, Math.max(0, t * 1.5 - i * 0.15)));
          const sway = Math.sin(frame / 30 + i * 1.7) * 1.6;
          const trunkW = Math.max(14, r * 0.34);
          const lower = stagger && i % 2 === 1;
          const signTop = ground + 36 + (lower ? signH + 16 : 0);
          // A board never leaves the margins; in staggered landscape rows the edge boards narrow
          // instead of sliding, so no stake runs behind a neighbouring board.
          const maxW = tall ? 340 : 260;
          const wide = stagger ? 2 * slotW - 24 : slotW - 16;
          const signW = Math.min(maxW, wide, 2 * (Math.min(cx, 1000 - cx) - MARGIN));
          const crownY = -trunkH - r * 0.72;
          return (
            <g key={tree.name}>
              <g transform={`translate(${cx} ${ground}) rotate(${sway}) scale(${grow})`}>
                <rect
                  x={-trunkW / 2}
                  y={-trunkH - 4}
                  width={trunkW}
                  height={trunkH + 4}
                  fill={BARK}
                  stroke={palette.ink}
                  strokeWidth={4}
                />
                {[true, false].map((outline) =>
                  LOBES.map((l) => (
                    <circle
                      key={`${outline}-${l.x}-${l.y}`}
                      cx={l.x * r}
                      cy={crownY + l.y * r}
                      r={l.r * r}
                      fill={outline ? palette.ink : tree.color}
                      stroke={outline ? palette.ink : "none"}
                      strokeWidth={outline ? 10 : 0}
                    />
                  )),
                )}
                <ellipse
                  cx={-r * 0.3}
                  cy={crownY - r * 0.5}
                  rx={r * 0.26}
                  ry={r * 0.14}
                  fill={palette.paper}
                  opacity={0.35}
                />
              </g>
              <g opacity={grow}>
                <rect
                  x={cx - 3}
                  y={ground + 10}
                  width={6}
                  height={signTop - ground - 8}
                  fill={palette.ink}
                />
                <rect
                  x={cx - signW / 2}
                  y={signTop}
                  width={signW}
                  height={signH}
                  rx={8}
                  fill={palette.paper}
                  stroke={palette.ink}
                  strokeWidth={3}
                />
                <Label
                  x={cx}
                  y={signTop + signH * 0.45}
                  text={tree.name}
                  size={font}
                  weight={800}
                  anchor="middle"
                  maxWidth={signW - 16}
                />
                <Label
                  x={cx}
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
        {n > 0 && (
          <g opacity={t} transform={`translate(${canX} ${canY}) rotate(${tilt})`}>
            <path
              d={`M ${-can * 0.1} ${-can * 0.1} L ${-can * 0.62} ${-can * 0.42}`}
              stroke={palette.ink}
              strokeWidth={can * 0.1}
              strokeLinecap="round"
            />
            <path
              d={`M ${can * 0.45} ${-can * 0.1} Q ${can * 0.78} ${-can * 0.5} ${can * 0.4} ${-can * 0.6}`}
              fill="none"
              stroke={palette.ink}
              strokeWidth={can * 0.09}
            />
            <rect
              x={-can * 0.2}
              y={-can * 0.1}
              width={can * 0.7}
              height={can * 0.55}
              rx={can * 0.08}
              fill="#4E7FD9"
              stroke={palette.ink}
              strokeWidth={can * 0.06}
            />
            {[0, 1, 2].map((k) => {
              const phase = ((frame + k * 8) % 24) / 24;
              return (
                <ellipse
                  key={k}
                  cx={-can * 0.7 - phase * can * 0.15}
                  cy={-can * 0.42 + phase * can * 1.1}
                  rx={can * 0.05}
                  ry={can * 0.08}
                  fill="#4E7FD9"
                  opacity={1 - phase}
                />
              );
            })}
          </g>
        )}
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
      <CellArt pose="think" x={n > 0 ? cellX : 500} y={groundA + 10 + bob * t} width={cellW} />
    </AbsoluteFill>
  );
}
