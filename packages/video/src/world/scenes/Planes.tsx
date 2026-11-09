import { AbsoluteFill, interpolate, random } from "remotion";
import { easeOut, palette } from "../../theme";
import { mixHex } from "../chrome-tone";
import { CellArt, Label, labelWidth, SceneSvg, safeArea, sceneHeight } from "./kit";
import { planesModel } from "./planes.model";
import type { SceneProps } from "./types";

const SKY_TOP = "#7EC3EE";
const SKY_LOW = "#D9F0FB";
const BANDS = 20;
const GRASS = "#7DBB62";
const TARMAC = "#5B606A";
const LINE = "#F4EFE3";
const WING = "#FFFFFF";
const WING_SHADE = "#DCD5C0";
const KEEL = "#BDB59C";

/** A paper plane pointing right, centred on (0, 0), `r` long from nose to tail halves. */
function Plane({ r }: { r: number }) {
  const p = (x: number, y: number) => `${(x * r).toFixed(1)},${(y * r).toFixed(1)}`;
  return (
    <g strokeLinejoin="round" stroke={palette.ink} strokeWidth={Math.max(2, r * 0.07)}>
      <polygon points={`${p(1, 0)} ${p(-0.9, -0.62)} ${p(-0.45, 0)}`} fill={WING} />
      <polygon points={`${p(1, 0)} ${p(-0.9, 0.62)} ${p(-0.45, 0)}`} fill={WING_SHADE} />
      <polygon points={`${p(1, 0)} ${p(-0.45, 0)} ${p(-0.7, 0.24)}`} fill={KEEL} />
    </g>
  );
}

export function Planes({ data, size, layout, enter, frame }: SceneProps) {
  const model = planesModel(data);
  const login = data.profile.login;
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const wide = layout === "landscape";
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const stage = (from: number) => easeOut(Math.min(1, Math.max(0, t * 1.6 - from)));

  // The sign.
  const boardX = wide ? 40 : 70;
  const boardW = wide ? 470 : 860;
  const boardY = safe.top + (wide ? 6 : 14);
  const headH = wide ? 62 : 104;
  const rowH = wide ? 66 : 100;
  const boardH = headH + rowH * 3 + 14;
  const numSize = wide ? 40 : 66;
  const rowSize = wide ? 28 : 46;
  const pad = wide ? 22 : 36;

  // The ground: a strip of grass at the horizon, tarmac below with the runway down the middle.
  const rwTop = h * (wide ? 0.72 : layout === "compact" ? 0.65 : 0.6);
  const rwH = wide ? 86 : layout === "compact" ? 104 : 150;
  const rwMid = rwTop + rwH / 2;
  const horizon = rwTop - (wide ? 20 : 30);

  // Parked planes: one row on the runway, leaving room for Cell at the right end in landscape.
  const parkFrom = wide ? 60 : 85;
  const parkTo = wide ? 760 : 915;
  const parkStep = (parkTo - parkFrom) / 11;
  const parkR = wide ? Math.min(30, parkStep * 0.46) : Math.min(46, parkStep * 0.46);

  // Planes in the air: a loose grid in the sky between the sign and the horizon.
  const airX0 = wide ? boardX + boardW + 60 : 90;
  const airX1 = wide ? 940 : 910;
  const airY0 = wide ? safe.top + 30 : boardY + boardH + 70;
  const airY1 = wide ? horizon - 110 : horizon - 90;
  const compact = layout === "compact";
  const cols = wide ? 3 : compact ? 6 : 4;
  const rows = Math.max(1, Math.ceil(model.drawnFlying / cols));
  const flyR = wide ? 34 : compact ? 40 : 54;
  const flying = Array.from({ length: model.drawnFlying }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const stagger = row % 2 === 0 ? 0 : 0.4;
    const gx = (col + 0.5 + stagger * 0.5) / (cols + 0.25);
    const gy = (row + 0.5) / rows;
    return {
      i,
      x: airX0 + gx * (airX1 - airX0) + (random(`planes-${login}${i}-x`) - 0.5) * 36,
      y: airY0 + gy * (airY1 - airY0) + (random(`planes-${login}${i}-y`) - 0.5) * 24,
      phase: random(`planes-${login}${i}-p`) * 6.28,
      speed: 0.7 + random(`planes-${login}${i}-s`) * 0.6,
    };
  });

  // Cell cheers on the tarmac.
  const cellW = wide ? Math.min(260, h * 0.45) : Math.min(560, h * (compact ? 0.26 : 0.3));
  const cellX = wide ? 880 : 500;
  const cellY = wide ? Math.min(h - safe.bottom * 0.5, rwTop + rwH + 60) : h - safe.bottom - 6;
  const hop = Math.max(0, Math.sin(frame / 9)) * 10 * t;

  const clouds = [
    { x: 160, y: 0.3, r: 46 },
    { x: 760, y: 0.17, r: 38 },
    { x: 520, y: 0.5, r: 30 },
  ].map((c) => ({ ...c, y: horizon * c.y }));

  const rowYs = [0, 1, 2].map((k) => boardY + headH + rowH * k);
  const head = model.empty ? "No pull requests this year" : "Arrivals";
  const lines = model.rows.map((r) => `${r.value === null ? "" : `${r.value} `}${r.label}`);

  return (
    <AbsoluteFill style={{ backgroundColor: SKY_LOW }}>
      <SceneSvg
        title={`${head}. ${lines.join(", ")}. ${
          model.drawnFlying > 0
            ? `${model.drawnFlying} paper planes in the air`
            : "No paper planes in the air"
        }, ${model.drawnLanded} parked on the runway. Cell cheers on the tarmac.`}
      >
        {Array.from({ length: BANDS }, (_, k) => k).map((k) => (
          <rect
            key={k}
            x={0}
            y={(horizon * k) / BANDS}
            width={1000}
            height={horizon / BANDS + 1}
            fill={mixHex(SKY_TOP, SKY_LOW, k / (BANDS - 1))}
          />
        ))}
        {clouds.map((c) => {
          const drift = Math.sin(frame / 90 + c.x) * 10;
          return (
            <g key={c.x} transform={`translate(${c.x + drift} ${c.y})`} fill="#FFFFFF">
              <circle cx={-c.r * 0.9} cy={c.r * 0.2} r={c.r * 0.7} fillOpacity={0.8} />
              <circle cx={0} cy={0} r={c.r} fillOpacity={0.8} />
              <circle cx={c.r * 1.0} cy={c.r * 0.25} r={c.r * 0.65} fillOpacity={0.8} />
            </g>
          );
        })}
        <rect x={0} y={horizon} width={1000} height={rwTop - horizon + 2} fill={GRASS} />
        <rect x={0} y={rwTop} width={1000} height={h - rwTop} fill={TARMAC} />
        <rect x={0} y={rwTop} width={1000} height={5} fill={LINE} fillOpacity={0.8} />
        <rect x={0} y={rwTop + rwH - 5} width={1000} height={5} fill={LINE} fillOpacity={0.8} />
        {Array.from({ length: 10 }, (_, k) => k).map((k) => (
          <rect
            key={k}
            x={k * 100 + 20}
            y={rwMid - 3}
            width={56}
            height={6}
            fill={LINE}
            fillOpacity={0.55}
          />
        ))}
        {flying.map((f) => {
          const p = stage((f.i / Math.max(1, model.drawnFlying)) * 0.8);
          const dx = Math.sin(frame / (34 / f.speed) + f.phase) * 16;
          const dy = Math.cos(frame / (44 / f.speed) + f.phase) * 10;
          const tilt = -10 + Math.sin(frame / (30 / f.speed) + f.phase) * 5;
          return (
            <g
              key={f.i}
              opacity={p}
              transform={`translate(${f.x + dx - (1 - p) * 260} ${f.y + dy}) rotate(${tilt})`}
            >
              <Plane r={flyR} />
            </g>
          );
        })}
        {Array.from({ length: model.drawnLanded }, (_, i) => `landed-${i}`).map((id, i) => {
          const p = stage(0.3 + (i / 12) * 0.5);
          return (
            <g
              key={id}
              opacity={p}
              transform={`translate(${parkFrom + i * parkStep} ${rwMid + (1 - p) * -50 + 4})`}
            >
              <Plane r={parkR} />
            </g>
          );
        })}
        <g opacity={stage(0)} transform={`translate(0 ${(1 - stage(0)) * -30})`}>
          <rect
            x={boardX}
            y={boardY}
            width={boardW}
            height={boardH}
            rx={16}
            fill={palette.paper}
            stroke={palette.ink}
            strokeWidth={5}
          />
          <rect x={boardX} y={boardY} width={boardW} height={headH} rx={14} fill={palette.ink} />
          <rect x={boardX} y={boardY + headH - 14} width={boardW} height={14} fill={palette.ink} />
          <Label
            x={boardX + pad}
            y={boardY + headH * 0.68}
            text={head}
            size={headH * 0.5}
            weight={800}
            fill={palette.paper}
            maxWidth={boardW - pad * 2}
          />
          {model.rows.map((r, k) => {
            const y = rowYs[k] ?? 0;
            const base = y + rowH * 0.68;
            // A long figure ("about 1,011") shrinks so the label beside it keeps its size.
            const fullW = r.value === null ? 0 : labelWidth(r.value, numSize, 800);
            const rowNum =
              fullW > (boardW - pad * 2) * 0.4
                ? (numSize * (boardW - pad * 2) * 0.4) / fullW
                : numSize;
            const valW = r.value === null ? 0 : Math.min(fullW, (boardW - pad * 2) * 0.4) + 24;
            return (
              <g key={r.label}>
                {k > 0 && (
                  <rect
                    x={boardX + pad * 0.6}
                    y={y}
                    width={boardW - pad * 1.2}
                    height={2.5}
                    fill={palette.ink}
                    fillOpacity={0.25}
                  />
                )}
                <Label
                  x={boardX + pad}
                  y={base}
                  text={r.label}
                  size={rowSize}
                  weight={700}
                  maxWidth={boardW - pad * 2 - valW}
                />
                {r.value !== null && (
                  <Label
                    x={boardX + boardW - pad}
                    y={base + (rowNum - rowSize) * 0.2}
                    text={r.value}
                    size={rowNum}
                    weight={800}
                    anchor="end"
                    maxWidth={boardW - pad * 2}
                  />
                )}
              </g>
            );
          })}
        </g>
      </SceneSvg>
      <CellArt pose="cheer" x={cellX} y={cellY - hop} width={cellW} />
    </AbsoluteFill>
  );
}
