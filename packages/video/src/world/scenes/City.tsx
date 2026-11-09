import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, formatCount, palette } from "../../theme";
import { cityModel } from "./city.model";
import { Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import type { SceneProps } from "./types";

/**
 * Only the sign: CityLayer draws the city itself, so this layer stays transparent and keeps to
 * the band above it.
 */
export function City({ data, size, layout, enter }: SceneProps) {
  const { total, final } = cityModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const landscape = layout === "landscape";
  const unit = Math.min(1000, h);
  // In landscape the city fills the top; the free corner is the bottom left, under its diagonal.
  const w = landscape ? 340 : 800;
  const boxH = (landscape ? h * 0.32 : Math.min(unit * 0.26, 300)) + (final ? 0 : 34);
  const top = landscape ? h - safe.bottom - boxH - 10 : safe.top + 8;
  const cx = landscape ? 20 + w / 2 : 500;
  const title = `This year you made ${formatCount(total)} contributions${final ? "" : " so far"}`;
  return (
    <AbsoluteFill>
      <SceneSvg title={title}>
        <g opacity={t} transform={`translate(0 ${(1 - t) * -20})`}>
          <rect
            x={cx - w / 2}
            y={top}
            width={w}
            height={boxH}
            rx={18}
            fill={palette.paper}
            stroke={palette.ink}
            strokeWidth={6}
          />
          <Label
            x={cx}
            y={top + boxH * (final ? 0.26 : 0.22)}
            text={final ? "This year you made" : "This year so far you made"}
            size={boxH * 0.13}
            weight={700}
            anchor="middle"
            maxWidth={w - 60}
            fill={palette.inkSoft}
          />
          <Label
            x={cx}
            y={top + boxH * (final ? 0.64 : 0.6)}
            text={formatCount(total)}
            size={boxH * 0.38}
            weight={800}
            anchor="middle"
            maxWidth={w - 60}
          />
          <Label
            x={cx}
            y={top + boxH * (final ? 0.86 : 0.8)}
            text="contributions · one building per day"
            size={boxH * 0.11}
            weight={700}
            anchor="middle"
            maxWidth={w - 60}
            fill={palette.inkSoft}
          />
          {!final && (
            <Label
              x={cx}
              y={top + boxH * 0.95}
              text="not yet: days still to come"
              size={boxH * 0.09}
              weight={400}
              anchor="middle"
              maxWidth={w - 60}
              fill={palette.inkSoft}
            />
          )}
        </g>
      </SceneSvg>
    </AbsoluteFill>
  );
}
