import { AbsoluteFill, interpolate, random } from "remotion";
import { easeOut, palette } from "../../theme";
import { CellArt, Label, labelWidth, SceneSvg, safeArea, sceneHeight } from "./kit";
import { countText, skyModel } from "./sky.model";
import type { SceneProps } from "./types";

const SKY_TOP = "#0A0D2B";
const SKY_LOW = "#222B66";
const STAR = "#FFF1C2";
const BRIGHT = "#FFD84D";
/** A moonlit near hill: pale, so the footer line Chrome draws in ink stays readable on it. */
const HILL = "#B4C2EC";
const HILL_FAR = "#38468F";
const HILL_RIM = "#E6EBFF";
const WOOD = "#C98A4B";
const WOOD_DARK = "#7A4B22";

/** A five-pointed star centred on (0, 0) with outer radius `r`. */
function starPoints(r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 === 0 ? r : r * 0.42;
    return `${(Math.cos(a) * d).toFixed(2)},${(Math.sin(a) * d).toFixed(2)}`;
  }).join(" ");
}

type Box = { x0: number; x1: number; y0: number; y1: number };
const inside = (x: number, y: number, b: Box) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

export function Sky({ data, size, layout, enter, frame }: SceneProps) {
  const model = skyModel(data);
  const login = data.profile.login;
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const wide = layout === "landscape";
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const none = model.stars.value === 0;

  // The ground: a quadratic hill that peaks mid-frame at hillTop and sinks to both edges.
  const hillTop = h * (wide ? 0.76 : layout === "compact" ? 0.7 : 0.66);
  const edge = hillTop + h * (wide ? 0.07 : 0.06);
  const ctrl = 2 * hillTop - edge;
  const hillY = (x: number) => {
    const u = x / 1000;
    return (1 - u) ** 2 * edge + 2 * u * (1 - u) * ctrl + u ** 2 * edge;
  };
  const hillPath = `M0 ${h} L0 ${edge} Q500 ${ctrl} 1000 ${edge} L1000 ${h} Z`;
  const farTop = hillTop - h * 0.05;
  const farPath = `M0 ${h} L0 ${farTop + h * 0.05} Q300 ${farTop - h * 0.04} 620 ${farTop + h * 0.02} T1000 ${farTop} L1000 ${h} Z`;

  // The brightest star: stacked above its words in tall frames, beside them in landscape.
  const skyH = hillTop - safe.top;
  const R = none
    ? wide
      ? 40
      : Math.min(90, skyH * 0.08)
    : wide
      ? Math.min(90, skyH * 0.3)
      : Math.min(230, skyH * 0.17);
  const bigX = wide ? 300 : 500;
  const bigY = wide ? safe.top + skyH * 0.3 : safe.top + skyH * 0.3;
  const numSize = none ? 0 : wide ? Math.min(110, R * 1.3) : Math.min(130, R * 0.75);
  const labelSize = none
    ? wide
      ? 44
      : 54
    : wide
      ? Math.min(40, R * 0.45)
      : Math.min(46, R * 0.26);
  const textX = wide ? bigX + R * 1.5 : 500;
  const anchor = wide ? "start" : "middle";
  const numY = wide ? bigY + numSize * 0.1 : bigY + R * 1.25 + numSize;
  const labelY = none
    ? wide
      ? bigY + labelSize * 0.35
      : bigY + R * 1.4 + labelSize
    : numY + labelSize * 1.5;
  const textW = wide ? 1000 - textX - 40 : 880;
  const aboutNum = countText(model.stars.value, model.stars.estimated);

  // Small stars keep clear of the big star's words; seeded per login so a recap is stable.
  const numW = none ? 0 : labelWidth(aboutNum, numSize, 800);
  const labW = labelWidth(model.stars.label, labelSize, 700);
  const textHalf = Math.min(textW, Math.max(numW, labW)) / 2;
  const keepOut: Box[] = wide
    ? [
        { x0: bigX - R * 1.5, x1: bigX + R * 1.5, y0: bigY - R * 1.5, y1: bigY + R * 1.5 },
        { x0: textX - 20, x1: textX + textHalf * 2 + 20, y0: bigY - numSize, y1: labelY + 25 },
      ]
    : [
        { x0: bigX - R * 1.5, x1: bigX + R * 1.5, y0: bigY - R * 1.5, y1: bigY + R * 1.5 },
        { x0: 500 - textHalf - 20, x1: 500 + textHalf + 20, y0: numY - numSize, y1: labelY + 25 },
      ];
  const lowest = hillTop - h * (wide ? 0.045 : 0.01);
  const small = Array.from({ length: model.drawn }, (_, i) => {
    let x = 0;
    let y = 0;
    for (let a = 0; a < 16; a++) {
      const k = a === 0 ? "" : `-${a}`;
      x = 30 + random(`sky-${login}${i}${k}`) * 940;
      y = safe.top + random(`sky-${login}${i}-y${k}`) * (lowest - safe.top);
      if (!keepOut.some((b) => inside(x, y, b))) break;
    }
    const r = random(`sky-${login}${i}-r`);
    return { x, y, r, rad: 2.6 + r * 3.2, phase: random(`sky-${login}${i}-p`) * 6.28, i };
  });

  // The ground's residents: Cell asleep on the left, the forks sign planted on the right.
  // Tall frames stand them on the hill's face, below its crest, so the ground earns its height.
  const cellDrop = wide ? 0 : h * 0.1;
  const signDrop = wide ? 0 : h * 0.08;
  const cellW = wide ? Math.min(340, h * 0.5) : Math.min(640, h * 0.38);
  const cellX = wide ? 230 : 270;
  const signX = wide ? 800 : 760;
  const boardW = wide ? 330 : 440;
  const boardH = wide ? 105 : 180;
  const postH = wide ? 40 : 130;
  const signBase = hillY(signX) + 12 + signDrop;
  const boardY = signBase - postH - boardH;
  const forksNum = countText(model.forks.value, model.forks.estimated);
  const signIn = easeOut(Math.min(1, Math.max(0, t * 1.5 - 0.35)));
  const bob = Math.sin(frame / 22) * 2;
  const bigPulse = 1 + Math.sin(frame / 18) * 0.04;
  const bigIn = easeOut(Math.min(1, t * 1.6));
  const textIn = easeOut(Math.min(1, Math.max(0, t * 1.5 - 0.3)));

  return (
    <AbsoluteFill style={{ backgroundColor: SKY_TOP }}>
      <SceneSvg
        title={`${
          none
            ? "No stars yet"
            : `${aboutNum} ${model.stars.label}, drawn as ${model.drawn} small stars around one bright star`
        }. ${forksNum} ${model.forks.label}, on a sign. Cell sleeps on the hill.`}
      >
        <defs>
          <linearGradient id="sky-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKY_TOP} />
            <stop offset="1" stopColor={SKY_LOW} />
          </linearGradient>
          <radialGradient id="sky-glow">
            <stop offset="0" stopColor={BRIGHT} stopOpacity={0.55} />
            <stop offset="1" stopColor={BRIGHT} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={1000} height={h} fill="url(#sky-bg)" />
        {small.map((s) => {
          const p = easeOut(
            Math.min(1, Math.max(0, t * 1.7 - (s.i / Math.max(1, model.drawn)) * 0.9)),
          );
          const twinkle = 0.6 + 0.4 * Math.sin(frame / (12 + s.r * 14) + s.phase);
          return (
            <g key={s.i} opacity={p * twinkle} transform={`translate(${s.x} ${s.y})`}>
              <circle r={s.rad * (0.6 + 0.4 * p)} fill={STAR} />
              {s.rad > 4.4 && (
                <path
                  d={`M0 ${-s.rad * 2.4}L0 ${s.rad * 2.4}M${-s.rad * 2.4} 0L${s.rad * 2.4} 0`}
                  stroke={STAR}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}
        <g
          opacity={none ? 0.4 * bigIn : bigIn}
          transform={`translate(${bigX} ${bigY}) scale(${bigIn * (none ? 1 : bigPulse)})`}
        >
          <circle r={R * 2.4} fill="url(#sky-glow)" />
          <polygon
            points={starPoints(R)}
            fill={none ? STAR : BRIGHT}
            stroke={palette.paper}
            strokeWidth={none ? 2 : 4}
            strokeLinejoin="round"
          />
        </g>
        <g opacity={textIn}>
          {!none && (
            <Label
              x={textX}
              y={numY}
              text={aboutNum}
              size={numSize}
              weight={800}
              anchor={anchor}
              maxWidth={textW}
              fill={BRIGHT}
            />
          )}
          <Label
            x={textX}
            y={labelY}
            text={model.stars.label}
            size={labelSize}
            weight={700}
            anchor={anchor}
            maxWidth={textW}
            fill={palette.paper}
          />
        </g>
        <path d={farPath} fill={HILL_FAR} />
        <path d={hillPath} fill={HILL} stroke={HILL_RIM} strokeWidth={4} />
        <g opacity={signIn} transform={`translate(0 ${(1 - signIn) * 60})`}>
          <rect
            x={signX - 9}
            y={boardY + boardH - 6}
            width={18}
            height={postH + 10}
            fill={WOOD_DARK}
            stroke={palette.ink}
            strokeWidth={3}
          />
          <rect
            x={signX - boardW / 2}
            y={boardY}
            width={boardW}
            height={boardH}
            rx={10}
            fill={WOOD}
            stroke={palette.ink}
            strokeWidth={4}
          />
          <Label
            x={signX}
            y={boardY + boardH * 0.56}
            text={forksNum}
            size={boardH * 0.46}
            weight={800}
            anchor="middle"
            maxWidth={boardW - 36}
          />
          <Label
            x={signX}
            y={boardY + boardH * 0.86}
            text={model.forks.label}
            size={boardH * 0.2}
            weight={700}
            anchor="middle"
            maxWidth={boardW - 36}
          />
        </g>
      </SceneSvg>
      <CellArt
        pose="sleep"
        x={cellX}
        y={hillY(cellX) + cellDrop + cellW * 0.15 + bob * t}
        width={cellW}
      />
    </AbsoluteFill>
  );
}
