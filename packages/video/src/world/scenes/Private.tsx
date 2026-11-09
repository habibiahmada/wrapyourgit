import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, formatCount, palette } from "../../theme";
import { Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import { privateModel } from "./private.model";
import type { SceneProps } from "./types";

const BRASS = "#C9A24B";
const WOOD = "#7A4B2A";

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
