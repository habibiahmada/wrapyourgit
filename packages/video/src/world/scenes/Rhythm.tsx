import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, formatCount, palette } from "../../theme";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import { rhythmModel } from "./rhythm.model";
import type { SceneProps } from "./types";

const MARGIN = 30;
const GAP = 12;
const CARS = 7;
/** Tallest heap, in car-body heights; heaps are 72% of a car wide and read as piled goods. */
const HEAP_MAX = 2.2;
const HEAP_WIDTH = 0.72;
const CELL_PER_BODY = 1.9;
const CELL_RATIO = 0.75;
const WHEEL = 0.16;
const SKY = "#DDF3E1";
const CARGO = palette.heat[3];

/** A mound: flat foot, rounded shoulders, a broad crown. */
function heapPath(cx: number, base: number, w: number, hgt: number): string {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const top = base - hgt;
  return `M ${l} ${base} C ${l} ${base - hgt * 0.45} ${cx - w * 0.42} ${top} ${cx - w * 0.1} ${top} L ${cx + w * 0.1} ${top} C ${
    cx + w * 0.42
  } ${top} ${r} ${base - hgt * 0.45} ${r} ${base} Z`;
}

export function Rhythm({ data, size, enter, frame }: SceneProps) {
  const model = rhythmModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const carW = (1000 - 2 * MARGIN - GAP * (CARS - 1)) / CARS;
  const trainW = CARS * carW + (CARS - 1) * GAP;
  const titleSize = Math.min(72, h * 0.07);
  const captionSize = Math.min(34, h * 0.04);
  const titleY = safe.top + titleSize;
  const captionY = h - safe.bottom;
  // The band (Cell, heap, car, wheels) is as big as one row and the free height allow, centred
  // between the title and the caption.
  const bandTop = titleY + 30;
  const bandBottom = captionY - captionSize - 50;
  const perBody = (model.busiest ? CELL_PER_BODY * CELL_RATIO * 0.88 : 0) + HEAP_MAX + 1 + WHEEL;
  const bodyH = Math.min(carW * 0.85, (bandBottom - bandTop) / perBody);
  const wheelR = bodyH * WHEEL;
  const cellW = bodyH * CELL_PER_BODY;
  const cellH = cellW * CELL_RATIO;
  const bandH = (model.busiest ? cellH * 0.88 : 0) + HEAP_MAX * bodyH + bodyH + wheelR;
  const bandStart = bandTop + (bandBottom - bandTop - bandH) / 2;
  const bodyBottom = bandStart + bandH - wheelR;
  const bodyTop = bodyBottom - bodyH;
  const railY = bodyBottom + wheelR * 1.4;
  // The whole train, Cell with it, rolls in from beyond the left edge.
  const shift = -(1 - t) * (MARGIN + trainW + cellW / 2);
  const bob = Math.sin(frame / 12) * 3;
  const heapH = (fill: number) => (fill > 0 ? Math.max(bodyH * 0.12, fill * HEAP_MAX * bodyH) : 0);
  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <SceneSvg title={`${model.title}. ${model.caption}`}>
        <Label
          x={500}
          y={titleY}
          text={model.title}
          size={titleSize}
          weight={800}
          anchor="middle"
        />
        <rect x={0} y={railY} width={1000} height={8} fill="#6E5236" />
        <rect x={0} y={railY + 14} width={1000} height={5} fill="#6E5236" />
        <g transform={`translate(${shift} 0)`}>
          {model.cars.map((car, i) => {
            const x = MARGIN + i * (carW + GAP);
            const cx = x + carW / 2;
            const hh = heapH(car.fill);
            return (
              <g key={car.day}>
                {i < CARS - 1 && (
                  <rect
                    x={x + carW}
                    y={bodyBottom - bodyH * 0.3}
                    width={GAP}
                    height={6}
                    fill={palette.ink}
                  />
                )}
                {hh > 0 && (
                  <g>
                    <path d={heapPath(cx, bodyTop + 2, carW * HEAP_WIDTH, hh)} fill={CARGO} />
                    {hh > bodyH * 0.5 && (
                      <g fill={palette.heat[1]}>
                        <circle cx={cx - carW * 0.14} cy={bodyTop - hh * 0.55} r={carW * 0.045} />
                        <circle cx={cx + carW * 0.1} cy={bodyTop - hh * 0.32} r={carW * 0.035} />
                        <circle cx={cx + carW * 0.02} cy={bodyTop - hh * 0.8} r={carW * 0.03} />
                      </g>
                    )}
                  </g>
                )}
                <rect
                  x={x}
                  y={bodyTop}
                  width={carW}
                  height={bodyH}
                  rx={8}
                  fill={car.busiest ? palette.heat[2] : palette.heat[0]}
                  stroke={palette.ink}
                  strokeWidth={3}
                />
                <Label
                  x={cx}
                  y={bodyTop + bodyH * 0.45}
                  text={car.day}
                  size={bodyH * 0.34}
                  weight={800}
                  anchor="middle"
                  maxWidth={carW - 12}
                />
                <Label
                  x={cx}
                  y={bodyTop + bodyH * 0.82}
                  text={formatCount(car.count)}
                  size={bodyH * 0.27}
                  weight={700}
                  anchor="middle"
                  maxWidth={carW - 12}
                />
                <circle
                  cx={x + carW * 0.25}
                  cy={bodyBottom + wheelR * 0.3}
                  r={wheelR}
                  fill={palette.ink}
                />
                <circle
                  cx={x + carW * 0.75}
                  cy={bodyBottom + wheelR * 0.3}
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
        // Cell sits in the crown of its heap, feet slightly sunk into the goods.
        const feet = bodyTop - heapH(car.fill) + cellH * 0.3 + bob;
        return <CellArt key={car.day} pose="cheer" x={cx + shift} y={feet} width={cellW} />;
      })}
    </AbsoluteFill>
  );
}
