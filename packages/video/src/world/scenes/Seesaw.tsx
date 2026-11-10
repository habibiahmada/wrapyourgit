import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, formatCount, palette } from "../../theme";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import { MAX_TILT, seesawModel } from "./seesaw.model";
import type { SceneProps } from "./types";

const SKY = "#CFEAF7";
const SUN = "#FFD84D";
const CLOUD = "#FFFFFF";
const GRASS = "#7BC96F";
const GRASS_DARK = "#4E9A4B";
const WOOD = "#C98A4B";
const LAST_BOX = "#F4EFE3";
const BEAM_HALF = 350;
const BEAM_THICK = 26;
const RAD = Math.PI / 180;

/** Ease out with a little overshoot, so the beam settles like a weight landing. */
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

export function Seesaw({ data, size, layout, enter }: SceneProps) {
  const model = seesawModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const wide = layout === "landscape";
  const t = Math.min(1, Math.max(0, enter));
  const settle = t >= 1 ? 1 : easeOutBack(easeOut(t) * 0.999);
  const fade = interpolate(t, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  const level = "unavailable" in model;
  const angle = (level ? 0 : model.angle) * settle;
  const theta = angle * RAD;

  const boxW = wide ? 190 : 230;
  const boxH = wide ? 138 : 190;
  const drop = BEAM_HALF * Math.sin(MAX_TILT * RAD);
  const kickerSize = wide ? 26 : 34;
  const changeSize = Math.min(wide ? 84 : 130, h * (wide ? 0.15 : 0.09));
  const spanSize = wide ? 26 : 34;
  // Tall frames get a deeper meadow below the fulcrum, where Cell stands.
  const grassH = Math.max(safe.bottom + 14, h * (wide ? 0.12 : 0.2));
  const groundY = h - grassH;
  const headerH = kickerSize + changeSize * 1.05 + spanSize * 1.6;
  const need = boxH + 14 + drop + BEAM_THICK;
  const free = groundY - (safe.top + headerH + 24);
  const fh = Math.max(drop + 34, Math.min(wide ? 190 : 440, free - need));
  const slack = Math.max(0, free - need - fh);
  const top = safe.top + slack * 0.6;
  const kickerY = top + kickerSize;
  const changeY = kickerY + changeSize * 1.02;
  const spanY = changeY + spanSize * 1.5;
  const py = groundY - fh;
  // A cloud only where the sky between the header and the weights has room for it.
  const weightsTop = py - drop - BEAM_THICK / 2 - boxH;
  const cloudY = !wide && weightsTop - spanY > 190 ? (spanY + weightsTop) / 2 : null;
  const cx = 500;

  const rightX = cx + BEAM_HALF * Math.cos(theta);
  const rightY = py + BEAM_HALF * Math.sin(theta);
  const leftX = cx - BEAM_HALF * Math.cos(theta);
  const leftY = py - BEAM_HALF * Math.sin(theta);

  const title = level
    ? "Last year couldn't be read from GitHub"
    : `${model.change}. ${model.last.year}: ${formatCount(model.last.value)} contributions. ${model.current.year}: ${formatCount(model.current.value)}. ${model.span}`;

  /** A weight standing on a beam end; upright, whatever the tilt. */
  const weight = (x: number, y: number, fill: string, year: string, value: string) => {
    const x0 = x - boxW / 2;
    const y0 = y - BEAM_THICK / 2 - boxH;
    return (
      <g opacity={fade}>
        <rect
          x={x0}
          y={y0}
          width={boxW}
          height={boxH}
          rx={14}
          fill={fill}
          stroke={palette.ink}
          strokeWidth={4}
        />
        <Label
          x={x}
          y={y0 + boxH * 0.34}
          text={year}
          size={boxH * 0.2}
          weight={700}
          anchor="middle"
          maxWidth={boxW - 24}
          fill={palette.inkSoft}
        />
        <Label
          x={x}
          y={y0 + boxH * 0.74}
          text={value}
          size={boxH * 0.36}
          weight={800}
          anchor="middle"
          maxWidth={boxW - 24}
        />
      </g>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <SceneSvg title={title}>
        <circle cx={wide ? 880 : 840} cy={top + 44} r={wide ? 44 : 56} fill={SUN} />
        <g fill={CLOUD}>
          <ellipse cx={130} cy={top + 30} rx={90} ry={26} />
          <ellipse cx={190} cy={top + 14} rx={56} ry={24} />
          {cloudY !== null && <ellipse cx={700} cy={cloudY} rx={80} ry={22} />}
        </g>
        <rect x={0} y={groundY} width={1000} height={h - groundY} fill={GRASS} />
        <rect x={0} y={groundY} width={1000} height={12} fill={GRASS_DARK} />
        <Label
          x={cx}
          y={kickerY}
          text={level ? "Year over year" : "Contributions, year over year"}
          size={kickerSize}
          weight={700}
          anchor="middle"
          fill={palette.inkSoft}
        />
        <Label
          x={cx}
          y={changeY + (level ? 0 : 0)}
          text={level ? "Last year couldn't be read from GitHub" : model.change}
          size={level ? changeSize * 0.34 : changeSize}
          weight={800}
          anchor="middle"
          maxWidth={940}
        />
        {!level && (
          <Label
            x={cx}
            y={spanY}
            text={model.span}
            size={spanSize}
            weight={700}
            anchor="middle"
            fill={palette.inkSoft}
          />
        )}
        <polygon
          points={`${cx},${py} ${cx - 120},${groundY} ${cx + 120},${groundY}`}
          fill="#9A6A3A"
          stroke={palette.ink}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <g transform={`rotate(${angle} ${cx} ${py})`}>
          <rect
            x={cx - BEAM_HALF - 30}
            y={py - BEAM_THICK / 2}
            width={2 * BEAM_HALF + 60}
            height={BEAM_THICK}
            rx={10}
            fill={WOOD}
            stroke={palette.ink}
            strokeWidth={4}
          />
        </g>
        <circle cx={cx} cy={py} r={16} fill={palette.paper} stroke={palette.ink} strokeWidth={4} />
        {level ? (
          <g opacity={fade}>
            <rect
              x={leftX - boxW / 2}
              y={leftY - BEAM_THICK / 2 - boxH}
              width={boxW}
              height={boxH}
              rx={14}
              fill="none"
              stroke={palette.inkSoft}
              strokeWidth={4}
              strokeDasharray="18 12"
            />
            <Label
              x={leftX}
              y={leftY - BEAM_THICK / 2 - boxH * 0.66}
              text="Last year"
              size={boxH * 0.2}
              weight={700}
              anchor="middle"
              maxWidth={boxW - 24}
              fill={palette.inkSoft}
            />
            <Label
              x={leftX}
              y={leftY - BEAM_THICK / 2 - boxH * 0.16}
              text="?"
              size={boxH * 0.42}
              weight={800}
              anchor="middle"
              fill={palette.inkSoft}
            />
          </g>
        ) : (
          <>
            {weight(leftX, leftY, LAST_BOX, String(model.last.year), formatCount(model.last.value))}
            {weight(
              rightX,
              rightY,
              palette.heat[1],
              String(model.current.year),
              formatCount(model.current.value),
            )}
          </>
        )}
      </SceneSvg>
      {!wide && (
        <CellArt
          pose={level || model.angle < 0 ? "think" : "cheer"}
          x={770}
          y={h - safe.bottom - 10}
          width={Math.min(420, (grassH - safe.bottom) * 1.9)}
        />
      )}
    </AbsoluteFill>
  );
}
