import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, palette } from "../../theme";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import { commitsText, projectsModel, truncateLabel } from "./projects.model";
import type { SceneProps } from "./types";

const MARGIN = 30;
const WALL = "#F1E6CC";
const WOOD = "#C98A4B";
const WOOD_DARK = "#7A4B22";
const SHELF_H = 22;
const ROW_GAP = 28;
/** A crate is wider than tall, like a shipping crate seen from the front. */
const CRATE_RATIO = 1.35;
const MAX_CRATE_H = 200;

/** One wooden crate, front on: a dark frame, plank seams and a cross brace. Bottom-centre at (0, 0). */
function Crate({ w, h }: { w: number; h: number }) {
  const inset = Math.min(w, h) * 0.15;
  const iw = w - 2 * inset;
  const ih = h - 2 * inset;
  const seam = (k: number) => -h + inset + (ih * k) / 3;
  const nail = Math.max(2, inset * 0.18);
  return (
    <g>
      <rect
        x={-w / 2}
        y={-h}
        width={w}
        height={h}
        rx={3}
        fill={WOOD_DARK}
        stroke={palette.ink}
        strokeWidth={3}
      />
      <rect
        x={-w / 2 + inset}
        y={-h + inset}
        width={iw}
        height={ih}
        fill={WOOD}
        stroke={palette.ink}
        strokeWidth={2}
      />
      {[1, 2].map((k) => (
        <line
          key={k}
          x1={-w / 2 + inset}
          x2={w / 2 - inset}
          y1={seam(k)}
          y2={seam(k)}
          stroke={palette.ink}
          strokeOpacity={0.45}
          strokeWidth={2}
        />
      ))}
      <line
        x1={-w / 2 + inset}
        y1={-inset}
        x2={w / 2 - inset}
        y2={-h + inset}
        stroke={WOOD_DARK}
        strokeWidth={inset * 0.7}
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <circle
            key={`${sx}${sy}`}
            cx={sx * (w / 2 - inset / 2)}
            cy={-h / 2 + sy * (h / 2 - inset / 2)}
            r={nail}
            fill={palette.paper}
            stroke={palette.ink}
            strokeWidth={1}
          />
        )),
      )}
    </g>
  );
}

export function Projects({ data, size, layout, enter, frame }: SceneProps) {
  const model = projectsModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const tall = layout !== "landscape";
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const n = model.stacks.length;
  const titleSize = Math.min(72, h * 0.07);
  const captionSize = Math.min(34, h * 0.04);
  const titleY = safe.top + titleSize;
  const captionY = h - safe.bottom;
  const topLimit = titleY + 36;
  const bottomLimit = captionY - captionSize - 24;

  // Tall frames: two shelves, stacks 2 + 2, each crate as big as the height allows. Landscape:
  // one shelf. Cell takes the first slot of the top shelf, beside the tallest (first) stack.
  const rows = tall && n >= 2 ? 2 : 1;
  const firstRow = rows === 1 ? n : Math.ceil(n / 2);
  const rowA = model.stacks.slice(0, firstRow);
  const rowB = model.stacks.slice(firstRow);
  // In one row Cell's slot is narrower than a stack's, so names get the room.
  const cellUnits = tall ? 1 : 0.8;
  const stackSlots = Math.max(rowA.length, rowB.length, 1);
  const slotW = (1000 - 2 * MARGIN) / (stackSlots + cellUnits);
  const slotX = (i: number) => MARGIN + slotW * (i === 0 ? cellUnits / 2 : cellUnits + i - 0.5);

  const font = Math.max(22, Math.min(tall ? 44 : 30, h * (tall ? 0.026 : 0.05)));
  const nameGap = 14;
  const labelZone = SHELF_H + nameGap + font * 2.5 + 12;
  const maxCrates = Math.max(1, ...model.stacks.map((s) => s.crates));
  // Each shelf is as tall as its own tallest stack, all crates the same size, so the shelf with
  // the short stacks doesn't leave a gap: the height goes to the crates.
  const rowCrates = [rowA, rowB].slice(0, rows).map((r) => Math.max(1, ...r.map((s) => s.crates)));
  const totalCrates = rowCrates.reduce((a, b) => a + b, 0);
  const free = bottomLimit - topLimit - rows * labelZone - (rows - 1) * ROW_GAP;
  const crateH = Math.max(
    8,
    Math.min(free / totalCrates, (slotW * 0.84) / CRATE_RATIO, MAX_CRATE_H),
  );
  const crateW = crateH * CRATE_RATIO;
  const rowH = rowCrates.map((c) => c * crateH + labelZone);

  // The shelves, with their stacks and labels, are centred between the title and the legend.
  const groupH = rowH.reduce((a, b) => a + b, 0) + (rows - 1) * ROW_GAP;
  const top = topLimit + Math.max(0, (bottomLimit - topLimit - groupH) / 2);
  const ground0 = top + (rowCrates[0] ?? 1) * crateH;
  const groundOf = (row: number) =>
    row === 0 ? ground0 : ground0 + labelZone + ROW_GAP + (rowCrates[1] ?? 1) * crateH;
  const cellW = model.empty
    ? Math.min(460, h * 0.3)
    : Math.min(slotW * cellUnits * 0.95, 320, (rowCrates[0] ?? 1) * crateH * 1.2);
  const bob = Math.sin(frame / 14) * 3;

  const placed = [
    ...rowA.map((stack, i) => ({ stack, row: 0, cx: slotX(i + 1) })),
    ...rowB.map((stack, i) => ({ stack, row: 1, cx: slotX(i + 1) })),
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: WALL }}>
      <SceneSvg
        title={`${model.title}. ${
          model.empty
            ? "Nothing to stack until commits land in a repository"
            : `${model.stacks.map((s) => `${s.label} ${commitsText(s.commits)}`).join(", ")}. ${model.legend}`
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
        {Array.from({ length: rows }, (_, k) => k).map((k) => {
          const ground = groundOf(k);
          return (
            <g key={k}>
              <rect
                x={MARGIN / 2}
                y={ground}
                width={1000 - MARGIN}
                height={SHELF_H}
                fill={WOOD_DARK}
                stroke={palette.ink}
                strokeWidth={3}
              />
              <rect
                x={MARGIN / 2}
                y={ground}
                width={1000 - MARGIN}
                height={6}
                fill={WOOD}
                stroke={palette.ink}
                strokeWidth={3}
              />
            </g>
          );
        })}
        {placed.map(({ stack, row, cx }, i) => {
          const ground = groundOf(row);
          const nameMax = slotW - 20;
          const name = truncateLabel(stack.label, font * 0.62, 800, nameMax);
          const labelIn = easeOut(Math.min(1, Math.max(0, t * 1.4 - 0.1 - i * 0.05)));
          return (
            <g key={stack.label}>
              {Array.from({ length: stack.crates }, (_, k) => k).map((k) => {
                // Crates land one after another, lowest first, across the whole entrance.
                const p = easeOut(
                  Math.min(1, Math.max(0, t * 1.8 - (k / maxCrates) * 0.8 - i * 0.04)),
                );
                return (
                  <g
                    key={k}
                    opacity={p}
                    transform={`translate(${cx} ${ground - k * crateH - (1 - p) * crateH * 1.5})`}
                  >
                    <Crate w={crateW} h={crateH} />
                  </g>
                );
              })}
              <g opacity={labelIn}>
                <Label
                  x={cx}
                  y={ground + SHELF_H + nameGap + font}
                  text={name}
                  size={font}
                  weight={800}
                  anchor="middle"
                  maxWidth={nameMax}
                />
                <Label
                  x={cx}
                  y={ground + SHELF_H + nameGap + font * 2.2}
                  text={commitsText(stack.commits)}
                  size={font}
                  weight={700}
                  anchor="middle"
                  maxWidth={nameMax}
                  fill={palette.inkSoft}
                />
              </g>
            </g>
          );
        })}
        {model.legend && (
          <Label
            x={500}
            y={captionY}
            text={model.legend}
            size={captionSize}
            weight={700}
            anchor="middle"
          />
        )}
      </SceneSvg>
      <CellArt
        pose={model.empty ? "think" : "proud"}
        x={model.empty ? 500 : slotX(0)}
        y={groundOf(0) + 6 + bob * t}
        width={cellW}
      />
    </AbsoluteFill>
  );
}
