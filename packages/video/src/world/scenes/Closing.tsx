import { AbsoluteFill, interpolate, random } from "remotion";
import { easeOut, palette } from "../../theme";
import { mixHex } from "../chrome-tone";
import { closingModel } from "./closing.model";
import { CellArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import type { SceneProps } from "./types";

const SKY_TOP = "#04110D";
const SKY_LOW = "#12372B";
const BANDS = 24;
const GOLD = "#FFD84D";
const GREEN = "#39D353";
const MINT = "#9BE9A8";
const BUILDING = "#0A1F18";
const BUILDING_FAR = "#14392C";
const WINDOW = "#FFE08A";
const RAYS = 16;

type Burst = { x: number; y: number; r: number; color: string; accent: string; at: number };

/** One burst: rays and tip dots that grow with `t`, then bloom again on a seeded loop. */
function Firework({
  burst,
  index,
  t,
  frame,
  seed,
}: {
  burst: Burst;
  index: number;
  t: number;
  frame: number;
  seed: string;
}) {
  const grow = easeOut(Math.min(1, Math.max(0, (t - burst.at) / (1 - burst.at))));
  const period = 90 + Math.floor(random(`${seed}-p${index}`) * 50);
  const offset = Math.floor(random(`${seed}-o${index}`) * period);
  const phase = ((frame + offset) % period) / period;
  const bloom = 0.82 + 0.18 * easeOut(Math.min(1, phase * 2.5));
  const fade = 1 - 0.55 * Math.max(0, (phase - 0.55) / 0.45);
  const spin = random(`${seed}-s${index}`) * Math.PI;
  const r = burst.r * grow * bloom;
  return (
    <g opacity={grow * fade}>
      {Array.from({ length: RAYS }, (_, k) => k).map((k) => {
        const a = spin + (k * 2 * Math.PI) / RAYS;
        const long = k % 2 === 0;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const color = long ? burst.color : burst.accent;
        return (
          <g key={k}>
            <line
              x1={burst.x + c * r * 0.42}
              y1={burst.y + s * r * 0.42}
              x2={burst.x + c * r * (long ? 0.86 : 0.7)}
              y2={burst.y + s * r * (long ? 0.86 : 0.7)}
              stroke={color}
              strokeWidth={long ? 7 : 5}
              strokeLinecap="round"
            />
            <circle
              cx={burst.x + c * r * (long ? 1 : 0.82)}
              cy={burst.y + s * r * (long ? 1 : 0.82)}
              r={long ? 8 : 6}
              fill={color}
            />
          </g>
        );
      })}
      <circle cx={burst.x} cy={burst.y} r={r * 0.12} fill={burst.accent} fillOpacity={0.5} />
    </g>
  );
}

export function Closing({ data, size, layout, enter, frame }: SceneProps) {
  const model = closingModel(data);
  const login = data.profile.login;
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const wide = layout === "landscape";
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const bob = Math.sin(frame / 24) * 3;
  const seed = `closing-${login}`;

  // Skyline along the bottom, built from seeded building widths and heights.
  const skylineBase = h - safe.bottom * 0.5;
  const maxBuilding = h * (wide ? 0.24 : 0.17);
  const buildings: { x: number; w: number; top: number; far: boolean; i: number }[] = [];
  for (let x = -10, i = 0; x < 1000; i++) {
    const w = 60 + random(`${seed}-bw${i}`) * 80;
    const far = i % 2 === 0;
    const hh = maxBuilding * (0.35 + random(`${seed}-bh${i}`) * 0.65) * (far ? 1 : 0.8);
    buildings.push({ x, w, top: skylineBase - hh, far, i });
    x += w * (far ? 0.7 : 0.9);
  }

  // Cell large in the foreground; tall frames centre it, landscape moves it right.
  const cellW = wide ? Math.min(460, h * 0.78) : Math.min(820, h * 0.44);
  const cellX = wide ? 790 : 500;
  const cellY = h - safe.bottom * 0.15 + (1 - t) * 80 + bob * t;
  const cellTop = cellY - cellW * 0.75;

  // Text: tall frames stack it at the top, landscape sets it on the left.
  const textX = wide ? 70 : 500;
  const anchor = wide ? "start" : "middle";
  const textW = wide ? 520 : 880;
  const dateSize = wide ? 36 : 52;
  const yearSize = wide ? 150 : layout === "compact" ? 200 : 250;
  const lineSize = wide ? 40 : layout === "compact" ? 52 : 60;
  const top = wide ? h * 0.12 : safe.top + 50;
  const dateY = top + dateSize;
  const yearY = dateY + yearSize * 0.95;
  const textIn = easeOut(Math.min(1, Math.max(0, t * 1.5 - 0.25)));
  const lineTop = yearY + (wide ? 55 : 80);
  const lineGap = lineSize * 1.45;

  // Bursts fill the sky the text leaves: right of it in landscape, between it and Cell in tall
  // frames, sized to that band.
  const textBottom = lineTop + 2 * lineGap + 20;
  const bandTop = textBottom + 20;
  const bandH = Math.max(120, cellTop + cellW * 0.3 - bandTop);
  const big = Math.min(260, bandH * 0.4);
  const bursts: Burst[] = wide
    ? [
        { x: 720, y: h * 0.25, r: 110, color: GOLD, accent: MINT, at: 0 },
        { x: 910, y: h * 0.32, r: 90, color: GREEN, accent: GOLD, at: 0.25 },
        { x: 610, y: h * 0.16, r: 60, color: MINT, accent: GREEN, at: 0.45 },
      ]
    : [
        { x: 260, y: bandTop + bandH * 0.5, r: big, color: GOLD, accent: MINT, at: 0 },
        { x: 770, y: bandTop + bandH * 0.45, r: big * 0.9, color: GREEN, accent: GOLD, at: 0.25 },
        { x: 500, y: bandTop + big * 0.55, r: big * 0.55, color: MINT, accent: GREEN, at: 0.45 },
      ];

  return (
    <AbsoluteFill style={{ backgroundColor: SKY_TOP }}>
      <SceneSvg
        title={`${model.date} ${model.year}. ${model.lines.join(", ")}. Fireworks over the city, and Cell waving.`}
      >
        {Array.from({ length: BANDS }, (_, k) => k).map((k) => (
          <rect
            key={k}
            x={0}
            y={(h * k) / BANDS}
            width={1000}
            height={h / BANDS + 1}
            fill={mixHex(SKY_TOP, SKY_LOW, k / (BANDS - 1))}
          />
        ))}
        {bursts.map((b, i) => (
          <Firework key={`${b.x}-${b.y}`} burst={b} index={i} t={t} frame={frame} seed={seed} />
        ))}
        {buildings
          .filter((b) => b.far)
          .map((b) => (
            <rect
              key={b.i}
              x={b.x}
              y={b.top - 30}
              width={b.w}
              height={h - b.top + 30}
              fill={BUILDING_FAR}
            />
          ))}
        {buildings
          .filter((b) => !b.far)
          .map((b) => (
            <g key={b.i}>
              <rect x={b.x} y={b.top} width={b.w} height={h - b.top} fill={BUILDING} />
              {Array.from({ length: 3 }, (_, k) => k).map((k) => {
                const lit = random(`${seed}-w${b.i}-${k}`) > 0.45;
                return (
                  lit && (
                    <rect
                      key={k}
                      x={b.x + 12 + (k % 2) * (b.w * 0.4)}
                      y={b.top + 16 + k * 26}
                      width={12}
                      height={14}
                      fill={WINDOW}
                      fillOpacity={0.8 * t}
                    />
                  )
                );
              })}
            </g>
          ))}
        <g opacity={textIn} transform={`translate(0 ${(1 - textIn) * 40})`}>
          <Label
            x={textX}
            y={dateY}
            text={model.date}
            size={dateSize}
            weight={700}
            anchor={anchor}
            maxWidth={textW}
            fill={palette.paper}
          />
          <Label
            x={textX}
            y={yearY}
            text={String(model.year)}
            size={yearSize}
            weight={800}
            anchor={anchor}
            maxWidth={textW}
            fill={GOLD}
          />
          {model.lines.map((line, i) => (
            <Label
              key={line}
              x={textX}
              y={lineTop + i * lineGap}
              text={line}
              size={i === 2 ? lineSize * 1.1 : lineSize}
              weight={i === 2 ? 800 : 700}
              anchor={anchor}
              maxWidth={textW}
              fill={i === 2 ? GREEN : palette.paper}
            />
          ))}
        </g>
      </SceneSvg>
      <CellArt pose="wave" x={cellX} y={cellY} width={cellW} />
    </AbsoluteFill>
  );
}
