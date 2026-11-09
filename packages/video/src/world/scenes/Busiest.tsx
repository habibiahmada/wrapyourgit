import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, formatCount, palette } from "../../theme";
import { contributionsLabel } from "../fade";
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
  const flagW = 760;
  const flagH = unit * 0.2;
  const poleH = unit * 0.06;
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
  const flagX = 500 - flagW / 2;
  const flagY = ground - bhFull - poleH - flagH;
  const poleX = 400;
  const cellW = unit * 0.34;
  const text = `${model.weekday}, ${model.date} · ${contributionsLabel(model.count, formatCount(model.count))}`;
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const lit = (r * 7 + c * 3) % 5 !== 0;
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={bx + gap + c * (cw + gap)}
          y={ground - bhFull + gap + r * (ch + gap) + (bhFull - bh)}
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
      <SceneSvg
        title={`Busiest day: ${model.weekday}, ${model.date}, ${model.count} contributions`}
      >
        <rect x={0} y={ground} width={1000} height={h - ground} fill={palette.ink} />
        <rect x={bx} y={top} width={bw} height={bh} rx={10} fill={palette.ink} />
        {windows}
        <g opacity={interpolate(enter, [0.5, 1], [0, 1], { extrapolateLeft: "clamp" })}>
          <line
            x1={poleX}
            y1={flagY + flagH}
            x2={poleX}
            y2={ground - bhFull}
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
            x={500}
            y={flagY + flagH * 0.42}
            text="busiest day"
            size={flagH * 0.3}
            weight={800}
            anchor="middle"
            maxWidth={flagW - 60}
          />
          <Label
            x={500}
            y={flagY + flagH * 0.78}
            text={text}
            size={flagH * 0.2}
            weight={700}
            anchor="middle"
            maxWidth={flagW - 60}
          />
        </g>
      </SceneSvg>
      <CellArt pose="proud" x={bx + bw + cellW * 0.6} y={ground} width={cellW} />
    </AbsoluteFill>
  );
}
