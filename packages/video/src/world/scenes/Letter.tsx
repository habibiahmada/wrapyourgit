import type { RecapData } from "@wyg/schema";
import { AbsoluteFill, interpolate } from "remotion";
import { heatLevels } from "../../heat";
import { congratsLetter } from "../../letter";
import { easeOut, fontFamily, palette } from "../../theme";
import { HeadArt, Label, SCENE_WIDTH, SceneSvg } from "./kit";
import {
  type LetterGeometry,
  type LetterLine,
  letterGeometry,
  paginateLetterLines,
} from "./letter.model";
import type { SceneProps } from "./types";

const DESK = "#2B2620";
const GRAIN = "rgba(244, 239, 227, 0.05)";
const FOLD = "#DED4BD";
/** Level 0 is a faint ink square on paper; 1-4 are GitHub's ramp. */
const HEAT = ["rgba(20, 19, 15, 0.08)", ...palette.heat] as const;
/** The paper's motif: cells in the side margins, as fractions of the sheet (decoration only). */
const MOTIF: { x: number; y: number; s: number; lit?: boolean }[] = [
  { x: 0.012, y: 0.34, s: 0.3 },
  { x: 0.026, y: 0.38, s: 0.2, lit: true },
  { x: 0.968, y: 0.5, s: 0.26 },
  { x: 0.955, y: 0.55, s: 0.18, lit: true },
  { x: 0.016, y: 0.8, s: 0.22 },
];

/**
 * The congratulations letter as a sheet of stationery on a desk, one stop per page: Cell's
 * letterhead and the person's own last weeks of contributions as the rule, the page's lines, an
 * "n / N" tab and a folded corner. All pages share one plot (ruling R7), so moving to a later
 * page is only its turn: the new sheet turns in over the previous one around its left edge (2D
 * scaleX and skewY from `enter`), and going back plays the turn in reverse.
 */
export function Letter({ data, stop, size, enter }: SceneProps) {
  const g = letterGeometry(size);
  const pages = paginateLetterLines(congratsLetter(data), size);
  const total = pages.length;
  const n = Math.min(Math.max(stop.page ?? 1, 1), total);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const px = size.width / SCENE_WIDTH;
  const turning = n > 1;
  const transform = turning
    ? `scaleX(${interpolate(t, [0, 1], [0.04, 1])}) skewY(${interpolate(t, [0, 1], [-12, 0])}deg)`
    : `translateY(${(1 - t) * g.body * 1.5 * px}px)`;

  return (
    <AbsoluteFill style={{ backgroundColor: DESK }}>
      <svg
        aria-hidden
        width={size.width}
        height={size.height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {[0.18, 0.41, 0.63, 0.86].map((y) => (
          <rect key={y} x={0} y={y * size.height} width={size.width} height={2} fill={GRAIN} />
        ))}
      </svg>
      {/* The page being turned over stays put underneath, so the turn reveals nothing but desk. */}
      {turning && (
        <AbsoluteFill>
          <Sheet data={data} g={g} lines={pages[n - 2] ?? []} n={n - 1} total={total} />
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          opacity: turning ? 1 : t,
          transform,
          transformOrigin: `${g.sheet.x * px}px ${(g.sheet.y + g.sheet.height / 2) * px}px`,
        }}
      >
        <Sheet data={data} g={g} lines={pages[n - 1] ?? []} n={n} total={total} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** One page of the letter on its sheet, in scene units, with Cell's head over the letterhead. */
function Sheet({
  data,
  g,
  lines,
  n,
  total,
}: {
  data: RecapData;
  g: LetterGeometry;
  lines: LetterLine[];
  n: number;
  total: number;
}) {
  const { sheet, body } = g;
  const year = data.meta.year;
  // The strip under the letterhead: as many of the last days as fit the text column.
  const cell = body * 0.4;
  const gap = cell * 0.25;
  const days = Math.floor((g.textWidth + gap) / (cell + gap));
  const strip = heatLevels(data.contributions.calendar).slice(-days);
  const corner = body * 1.6;
  const right = sheet.x + sheet.width;
  const bottom = sheet.y + sheet.height;
  const brand = g.head.x + g.head.size / 2 + body * 0.6;
  const stamp = { x: right - body * 2.6, y: g.head.y, r: body * 1.55 };

  return (
    <>
      <SceneSvg title={`Letter from Cell, page ${n} of ${total}`}>
        <rect
          x={sheet.x + body * 0.35}
          y={sheet.y + body * 0.5}
          width={sheet.width}
          height={sheet.height}
          rx={body * 0.5}
          fill="rgba(0, 0, 0, 0.35)"
        />
        <path
          d={`M ${sheet.x + body * 0.5} ${sheet.y} H ${right - body * 0.5} Q ${right} ${sheet.y} ${right} ${sheet.y + body * 0.5} V ${bottom - corner} L ${right - corner} ${bottom} H ${sheet.x + body * 0.5} Q ${sheet.x} ${bottom} ${sheet.x} ${bottom - body * 0.5} V ${sheet.y + body * 0.5} Q ${sheet.x} ${sheet.y} ${sheet.x + body * 0.5} ${sheet.y} Z`}
          fill={palette.paper}
        />
        <path
          d={`M ${right} ${bottom - corner} L ${right - corner} ${bottom - corner} L ${right - corner} ${bottom} Z`}
          fill={FOLD}
          stroke="rgba(20, 19, 15, 0.15)"
          strokeWidth={body * 0.06}
        />
        {MOTIF.map(({ x, y, s, lit }) => (
          <rect
            key={`${x}-${y}`}
            x={sheet.x + x * sheet.width}
            y={sheet.y + y * sheet.height}
            width={s * body}
            height={s * body}
            rx={s * body * 0.2}
            fill={lit ? "rgba(64, 196, 99, 0.45)" : "none"}
            stroke={lit ? "none" : "rgba(20, 19, 15, 0.12)"}
            strokeWidth={body * 0.05}
          />
        ))}

        {/* Letterhead: a green tile behind Cell's head, the sender, and a postmark. */}
        <rect
          x={g.head.x - g.head.size / 2}
          y={g.head.y - g.head.size / 2}
          width={g.head.size}
          height={g.head.size}
          rx={g.head.size * 0.22}
          fill="rgba(155, 233, 168, 0.4)"
        />
        <Label
          x={brand}
          y={g.head.y - body * 0.05}
          text="WrapYourGit"
          size={body * 1.15}
          weight={800}
          maxWidth={stamp.x - stamp.r - brand - body * 0.4}
        />
        <Label
          x={brand}
          y={g.head.y + body * 0.95}
          text={`From Cell · ${year}`}
          size={body * 0.75}
          weight={700}
          fill={palette.inkSoft}
          maxWidth={stamp.x - stamp.r - brand - body * 0.4}
        />
        <g transform={`rotate(-8 ${stamp.x} ${stamp.y})`} opacity={0.85}>
          <circle
            cx={stamp.x}
            cy={stamp.y}
            r={stamp.r}
            fill="none"
            stroke={palette.persimmon}
            strokeWidth={body * 0.08}
          />
          <circle
            cx={stamp.x}
            cy={stamp.y}
            r={stamp.r * 0.72}
            fill="none"
            stroke={palette.persimmon}
            strokeWidth={body * 0.05}
          />
          <text
            x={stamp.x}
            y={stamp.y + body * 0.25}
            textAnchor="middle"
            fill={palette.persimmon}
            fontFamily={fontFamily}
            fontSize={body * 0.7}
            fontWeight={800}
          >
            {year}
          </text>
        </g>
        {strip.map((level, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: one square per day, in order
            key={i}
            x={g.textX + i * (cell + gap)}
            y={g.strip.y}
            width={cell}
            height={cell}
            rx={cell * 0.2}
            fill={HEAT[level] ?? HEAT[0]}
          />
        ))}

        {lines.map((line, i) =>
          line.kind === "gap" ? null : (
            <Label
              // biome-ignore lint/suspicious/noArrayIndexKey: a page's lines, in order
              key={i}
              x={g.textX}
              y={g.firstBaseline + i * g.lineHeight}
              text={line.text}
              size={body}
              weight={line.kind === "body" ? 400 : 700}
              maxWidth={g.textWidth}
            />
          ),
        )}

        <rect
          x={sheet.x + sheet.width / 2 - body * 1.9}
          y={g.tabBaseline - body * 0.95}
          width={body * 3.8}
          height={body * 1.3}
          rx={body * 0.65}
          fill="none"
          stroke="rgba(20, 19, 15, 0.25)"
          strokeWidth={body * 0.06}
        />
        <Label
          x={sheet.x + sheet.width / 2}
          y={g.tabBaseline}
          text={`${n} / ${total}`}
          size={body * 0.75}
          weight={700}
          anchor="middle"
          fill={palette.inkSoft}
          maxWidth={body * 3.4}
        />
      </SceneSvg>
      <HeadArt x={g.head.x} y={g.head.y} size={g.head.size * 0.9} />
    </>
  );
}
