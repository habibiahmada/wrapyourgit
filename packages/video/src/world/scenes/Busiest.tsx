import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, palette } from "../../theme";
import { busiestModel } from "./busiest.model";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import type { SceneProps } from "./types";

const COLS = 4;

export function Busiest({ data, size, enter, frame }: SceneProps) {
  const model = busiestModel(data);
  if (!model) return null;
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const ground = h - safe.bottom - h * 0.04;
  const unit = Math.min(1000, h);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  // The pole is planted on the ground beside the building; the flag rides its top and follows the
  // roof up, with Cell at the pole's foot.
  const flagW = 600;
  const flagH = unit * 0.2;
  const poleH = unit * 0.05;
  const bw = unit * 0.36;
  const room = ground - safe.top - 10 - flagH - poleH;
  const bhFull = Math.min(unit * 1.15, room);
  const bh = bhFull * t;
  const bx = 400 - bw / 2;
  const top = ground - bh;
  const gap = bw * 0.1;
  const cw = (bw - gap * (COLS + 1)) / COLS;
  const rows = Math.max(3, Math.round(bhFull / (cw * 1.7 + gap)));
  const ch = (bhFull - gap) / rows - gap;
  const wave = Math.sin(frame / 20) * 3;
  const poleX = 700;
  const flagX = poleX - flagW;
  const flagY = top - poleH - flagH;
  const cellW = Math.min(unit * 0.34, 300);
  const windows = [];
  for (let r = 0; r < rows; r++) {
    const y = top + gap + r * (ch + gap);
    // Rows still below the ground while the building rises are not drawn.
    if (y + ch > ground) continue;
    for (let c = 0; c < COLS; c++) {
      const lit = (r * 7 + c * 3) % 5 !== 0;
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={bx + gap + c * (cw + gap)}
          y={y}
          width={cw}
          height={ch}
          rx={4}
          fill={lit ? palette.heat[(r + c) % 4] : "#2A2822"}
        />,
      );
    }
  }
  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <SceneSvg title={`Busiest day: ${model.detail}`}>
        <rect x={0} y={ground} width={1000} height={h - ground} fill={palette.ink} />
        <rect x={bx} y={top} width={bw} height={bh} rx={10} fill={palette.ink} />
        {windows}
        <g>
          <line
            x1={poleX}
            y1={flagY - 12}
            x2={poleX}
            y2={ground}
            stroke={palette.ink}
            strokeWidth={10}
          />
          <rect
            x={flagX}
            y={flagY + wave * 0.3}
            width={flagW}
            height={flagH}
            rx={14}
            fill={palette.persimmon}
            stroke={palette.ink}
            strokeWidth={6}
          />
          <Label
            x={flagX + flagW / 2}
            y={flagY + flagH * 0.42}
            text={model.headline}
            size={flagH * 0.3}
            weight={800}
            anchor="middle"
            maxWidth={flagW - 60}
          />
          <Label
            x={flagX + flagW / 2}
            y={flagY + flagH * 0.78}
            text={model.detail}
            size={flagH * 0.2}
            weight={700}
            anchor="middle"
            maxWidth={flagW - 60}
          />
        </g>
      </SceneSvg>
      <CellArt pose="proud" x={poleX + cellW * 0.28} y={ground} width={cellW} />
    </AbsoluteFill>
  );
}
