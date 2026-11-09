import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, formatCount, palette } from "../../theme";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import { rhythmModel } from "./rhythm.model";
import type { SceneProps } from "./types";

const MARGIN = 30;
const GAP = 12;
const CARS = 7;

export function Rhythm({ data, size, enter }: SceneProps) {
  const model = rhythmModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const carW = (1000 - 2 * MARGIN - GAP * (CARS - 1)) / CARS;
  const bodyH = Math.min(110, h * 0.12);
  const wheelR = bodyH * 0.16;
  const titleSize = Math.min(72, h * 0.07);
  const captionSize = Math.min(34, h * 0.04);
  const titleY = safe.top + titleSize;
  const captionY = h - safe.bottom;
  const cellW = Math.min(190, h * 0.26);
  const cellH = cellW * 0.75;
  // Rails sit above the caption; cargo and Cell fill what is left under the title.
  const railY = captionY - captionSize - 24;
  const bodyBottom = railY - wheelR;
  const bodyTop = bodyBottom - bodyH;
  const room = bodyTop - (titleY + 24) - (model.busiest ? cellH : 0);
  const cargoMax = Math.max(40, Math.min(h * 0.5, room));
  // The train rolls in from the left edge; one full train length covers the entry.
  const shift = -(1 - t) * 1100;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <SceneSvg title={`${model.title}. ${model.caption}`}>
        <Label
          x={500}
          y={titleY}
          text={model.title}
          size={titleSize}
          weight={800}
          anchor="middle"
        />
        <rect x={0} y={railY} width={1000} height={8} fill={palette.ink} />
        <g transform={`translate(${shift} 0)`}>
          {model.cars.map((car, i) => {
            const x = MARGIN + i * (carW + GAP);
            const cargoH = car.count > 0 ? Math.max(8, car.fill * cargoMax) : 0;
            const fill = car.busiest ? palette.ink : palette.cobalt;
            return (
              <g key={car.day}>
                {i < CARS - 1 && (
                  <rect
                    x={x + carW}
                    y={bodyBottom - bodyH * 0.3}
                    width={GAP}
                    height={8}
                    fill={palette.ink}
                  />
                )}
                {cargoH > 0 && (
                  <rect
                    x={x + 8}
                    y={bodyTop - cargoH}
                    width={carW - 16}
                    height={cargoH}
                    rx={6}
                    fill={car.busiest ? palette.persimmon : palette.heat[1]}
                    stroke={palette.ink}
                    strokeWidth={4}
                  />
                )}
                <rect
                  x={x}
                  y={bodyTop}
                  width={carW}
                  height={bodyH}
                  rx={10}
                  fill={fill}
                  stroke={palette.ink}
                  strokeWidth={4}
                />
                <Label
                  x={x + carW / 2}
                  y={bodyTop + bodyH * 0.45}
                  text={car.day}
                  size={bodyH * 0.34}
                  weight={800}
                  anchor="middle"
                  maxWidth={carW - 12}
                  fill={palette.paper}
                />
                <Label
                  x={x + carW / 2}
                  y={bodyTop + bodyH * 0.82}
                  text={formatCount(car.count)}
                  size={bodyH * 0.26}
                  weight={700}
                  anchor="middle"
                  maxWidth={carW - 12}
                  fill={palette.paper}
                />
                <circle
                  cx={x + carW * 0.25}
                  cy={bodyBottom + wheelR * 0.4}
                  r={wheelR}
                  fill={palette.ink}
                />
                <circle
                  cx={x + carW * 0.75}
                  cy={bodyBottom + wheelR * 0.4}
                  r={wheelR}
                  fill={palette.ink}
                />
              </g>
            );
          })}
        </g>
        <Label
          x={500}
          y={captionY}
          text={model.caption}
          size={captionSize}
          weight={700}
          anchor="middle"
          fill={palette.inkSoft}
        />
      </SceneSvg>
      {model.cars.map((car, i) => {
        if (!car.busiest) return null;
        const carCx = MARGIN + i * (carW + GAP) + carW / 2;
        const cx = Math.min(1000 - cellW / 2, Math.max(cellW / 2, carCx));
        const cargoH = Math.max(8, car.fill * cargoMax);
        return (
          <CellArt key={car.day} pose="cheer" x={cx + shift} y={bodyTop - cargoH} width={cellW} />
        );
      })}
    </AbsoluteFill>
  );
}
