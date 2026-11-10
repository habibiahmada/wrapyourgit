import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, formatCount, palette } from "../../theme";
import { Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import { privateModel } from "./private.model";
import type { SceneProps } from "./types";

const BRASS = "#C9A24B";
const WOOD = "#7A4B2A";

const IRON = "#3B3A36";

/**
 * A padlock hanging from a hasp: shackle (an outlined arc) over a brass body with a keyhole.
 * `top` is the top of the shackle and `height` the whole lock, shackle included.
 */
function Padlock({ cx, top, height }: { cx: number; top: number; height: number }) {
  const bodyH = height * 0.58;
  const bodyW = bodyH * 1.3;
  const bodyY = top + height - bodyH;
  const shackleW = bodyW * 0.6;
  const thick = bodyW * 0.13;
  const left = cx - shackleW / 2;
  const right = cx + shackleW / 2;
  const radius = shackleW / 2;
  // Legs reach into the body, so the body (drawn after) covers their ends.
  const shackle = `M ${left} ${bodyY + thick} V ${top + radius} A ${radius} ${radius} 0 0 1 ${right} ${top + radius} V ${bodyY + thick}`;
  // Outlines scale with the lock, so a small lock in a wide frame keeps its proportions.
  const line = height * 0.025;
  const keyR = bodyH * 0.12;
  const keyY = bodyY + bodyH * 0.42;
  return (
    <g>
      <rect
        x={cx - bodyW * 0.42}
        y={top - thick * 0.9}
        width={bodyW * 0.84}
        height={thick * 1.6}
        rx={thick * 0.3}
        fill={IRON}
        stroke={palette.ink}
        strokeWidth={line * 0.7}
      />
      <path d={shackle} fill="none" stroke={palette.ink} strokeWidth={thick + line * 2} />
      <path d={shackle} fill="none" stroke="#B9B6AC" strokeWidth={thick} />
      <rect
        x={cx - bodyW / 2}
        y={bodyY}
        width={bodyW}
        height={bodyH}
        rx={bodyH * 0.14}
        fill={BRASS}
        stroke={palette.ink}
        strokeWidth={line}
      />
      <circle cx={cx} cy={keyY} r={keyR} fill={palette.ink} />
      <polygon
        points={`${cx - keyR * 0.55},${keyY} ${cx + keyR * 0.55},${keyY} ${cx + keyR * 0.8},${keyY + keyR * 2.4} ${cx - keyR * 0.8},${keyY + keyR * 2.4}`}
        fill={palette.ink}
      />
    </g>
  );
}

export function Private({ data, size, enter }: SceneProps) {
  const model = privateModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const avail = h - safe.top - safe.bottom;
  const doorH = Math.min(avail - 150, 900);
  const doorW = Math.min(doorH * 0.55, 560);
  const dx = 500 - doorW / 2;
  const dy = safe.top + (avail - doorH - 110) / 2 + (1 - t) * 20;
  const open = model.kind === "none";
  const plateW = doorW * 0.92;
  const plateH = doorH * 0.26;
  const plateY = dy + doorH * 0.4;
  const main =
    model.kind === "count"
      ? `${model.estimated ? "about " : ""}${formatCount(model.count)}`
      : model.kind === "none"
        ? "Nothing private this year"
        : "Private contributions couldn't be read";
  const title = model.kind === "count" ? `${main} private contributions, counted` : main;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <SceneSvg title={title}>
        <g opacity={t}>
          <rect
            x={dx - 24}
            y={dy - 24}
            width={doorW + 48}
            height={doorH + 24}
            rx={24}
            fill={palette.ink}
          />
          {open ? (
            <>
              <rect x={dx} y={dy} width={doorW} height={doorH} fill="#2A2418" />
              <polygon
                points={`${dx},${dy} ${dx + doorW * 0.3},${dy + doorH * 0.04} ${dx + doorW * 0.3},${dy + doorH * 0.96} ${dx},${dy + doorH}`}
                fill={WOOD}
              />
            </>
          ) : (
            <>
              <rect x={dx} y={dy} width={doorW} height={doorH} fill={WOOD} />
              <rect
                x={dx + doorW * 0.12}
                y={dy + doorH * 0.06}
                width={doorW * 0.76}
                height={doorH * 0.3}
                rx={12}
                fill="none"
                stroke="#5A3719"
                strokeWidth={8}
              />
              <rect
                x={dx + doorW * 0.12}
                y={dy + doorH * 0.64}
                width={doorW * 0.76}
                height={doorH * 0.3}
                rx={12}
                fill="none"
                stroke="#5A3719"
                strokeWidth={8}
              />
              <circle
                cx={dx + doorW * 0.84}
                cy={dy + doorH * 0.52}
                r={18}
                fill={BRASS}
                stroke={palette.ink}
                strokeWidth={5}
              />
              {/* In the upper panel, clear of the count plaque below it. */}
              <Padlock cx={500} top={dy + doorH * 0.1} height={doorH * 0.24} />
            </>
          )}
        </g>
        {model.kind === "count" && (
          <g opacity={t}>
            <rect
              x={500 - plateW / 2}
              y={plateY}
              width={plateW}
              height={plateH}
              rx={14}
              fill={BRASS}
              stroke={palette.ink}
              strokeWidth={6}
            />
            <Label
              x={500}
              y={plateY + plateH * 0.56}
              text={main}
              size={plateH * 0.46}
              weight={800}
              anchor="middle"
              maxWidth={plateW - 40}
            />
            <Label
              x={500}
              y={plateY + plateH * 0.86}
              text="private contributions, counted"
              size={plateH * 0.17}
              weight={700}
              anchor="middle"
              maxWidth={plateW - 40}
            />
          </g>
        )}
        {model.kind !== "count" && (
          <g opacity={t}>
            <Label
              x={500}
              y={dy + doorH + 90}
              text={main}
              size={56}
              weight={800}
              anchor="middle"
              maxWidth={900}
            />
          </g>
        )}
      </SceneSvg>
    </AbsoluteFill>
  );
}
