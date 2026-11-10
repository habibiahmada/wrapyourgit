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
  const { total, headline, caption, legend } = cityModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const landscape = layout === "landscape";
  const unit = Math.min(1000, h);
  // In landscape the city fills the top; the free corner is the bottom left, under its diagonal.
  const w = landscape ? 320 : 800;
  const boxH = (landscape ? h * 0.24 : Math.min(unit * 0.2, 230)) + (legend ? 48 : 0);
  const top = landscape ? h - safe.bottom - boxH - 10 : safe.top + 8;
  const cx = landscape ? 20 + w / 2 : 500;
  const title = `${headline} ${formatCount(total)} contributions`;
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
            y={top + boxH * (legend ? 0.2 : 0.26)}
            text={headline}
            size={boxH * 0.13}
            weight={700}
            anchor="middle"
            maxWidth={w - 60}
            fill={palette.inkSoft}
          />
          <Label
            x={cx}
            y={top + boxH * (legend ? 0.55 : 0.64)}
            text={formatCount(total)}
            size={boxH * 0.38}
            weight={800}
            anchor="middle"
            maxWidth={w - 60}
          />
          <Label
            x={cx}
            y={top + boxH * (legend ? 0.76 : 0.86)}
            text={caption}
            size={boxH * 0.11}
            weight={700}
            anchor="middle"
            maxWidth={w - 60}
            fill={palette.inkSoft}
          />
          {legend && (
            <Label
              x={cx}
              y={top + boxH * 0.91}
              text={legend}
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
