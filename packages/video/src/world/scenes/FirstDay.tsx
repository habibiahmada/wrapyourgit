import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, palette } from "../../theme";
import { firstDayModel } from "./firstDay.model";
import { Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import type { SceneProps } from "./types";

const BLANK = "Every year starts with a blank graph";

export function FirstDay({ data, size, enter, frame }: SceneProps) {
  const model = firstDayModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const soilTop = h * 0.66;
  const soilBottom = h - safe.bottom;
  const grow = easeOut(interpolate(enter, [0.1, 1], [0, 1], { extrapolateLeft: "clamp" }));
  const unit = Math.min(1000, h);
  const stem = unit * 0.22 * grow;
  const sway = Math.sin(frame / 30) * 2 * grow;
  const x = 500;
  const leaf = unit * 0.09 * grow;
  const signY = Math.max(safe.top + 40, soilTop - unit * 0.62);
  const signW = 760;
  const signH = unit * 0.24;
  const sign = model ? "first square" : BLANK;
  const title = model
    ? `First square: ${model.date}, a ${model.weekday}`
    : "A blank graph: no contributions this year";
  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <SceneSvg title={title}>
        <rect x={0} y={soilTop} width={1000} height={soilBottom - soilTop} fill="#6B4A2F" />
        <rect x={0} y={soilTop} width={1000} height={unit * 0.02} fill="#4E3521" />
        <g opacity={interpolate(enter, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })}>
          <line
            x1={x}
            y1={signY + signH}
            x2={x}
            y2={soilTop + 12}
            stroke="#4E3521"
            strokeWidth={14}
          />
          <rect
            x={500 - signW / 2}
            y={signY}
            width={signW}
            height={signH}
            rx={18}
            fill={palette.paper}
            stroke={palette.ink}
            strokeWidth={8}
          />
          <Label
            x={500}
            y={signY + signH * (model ? 0.45 : 0.58)}
            text={sign}
            size={signH * (model ? 0.3 : 0.24)}
            weight={800}
            anchor="middle"
            maxWidth={signW - 60}
          />
          {model && (
            <Label
              x={500}
              y={signY + signH * 0.8}
              text={`${model.date}, ${model.weekday}`}
              size={signH * 0.2}
              weight={700}
              anchor="middle"
              maxWidth={signW - 60}
              fill={palette.inkSoft}
            />
          )}
        </g>
        {model && (
          <g transform={`rotate(${sway} ${x} ${soilTop})`}>
            <line
              x1={x + 140}
              y1={soilTop}
              x2={x + 140}
              y2={soilTop - stem}
              stroke={palette.heat[2]}
              strokeWidth={12}
              strokeLinecap="round"
            />
            <ellipse
              cx={x + 140 - leaf * 0.9}
              cy={soilTop - stem}
              rx={leaf}
              ry={leaf * 0.5}
              fill={palette.cell}
              transform={`rotate(-25 ${x + 140} ${soilTop - stem})`}
            />
            <ellipse
              cx={x + 140 + leaf * 0.9}
              cy={soilTop - stem}
              rx={leaf}
              ry={leaf * 0.5}
              fill={palette.heat[1]}
              transform={`rotate(25 ${x + 140} ${soilTop - stem})`}
            />
          </g>
        )}
      </SceneSvg>
    </AbsoluteFill>
  );
}
