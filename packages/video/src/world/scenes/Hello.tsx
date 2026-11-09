import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, palette } from "../../theme";
import { helloModel } from "./hello.model";
import { HeadArt, Label, SceneSvg, safeArea, sceneHeight } from "./kit";
import type { SceneProps } from "./types";

/** The baked face screen inside head-cell.png, as fractions of the still (measured off the art). */
const SCREEN = { cx: 0.52, cy: 0.68, w: 0.6, h: 0.43, tilt: 6 };
const GREEN = palette.heat[0];

export function Hello({ data, size, enter }: SceneProps) {
  const { login, year } = helloModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const head = 0.7 * Math.min(1000, h);
  const cx = 500;
  const cy = Math.max(safe.top + head / 2, h * 0.4);
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const rise = (1 - t) * 40;
  const sx = cx + (SCREEN.cx - 0.5) * head;
  const sy = cy + (SCREEN.cy - 0.5) * head - rise;
  const pw = SCREEN.w * head;
  const ph = SCREEN.h * head;
  const textY = Math.min(h - safe.bottom, cy + head / 2 + (h - cy - head / 2) * 0.5);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <HeadArt x={cx} y={cy - rise} size={head} />
      <SceneSvg title={`Hello, @${login}. Ready for your ${year}?`}>
        <g opacity={t} transform={`rotate(${SCREEN.tilt} ${sx} ${sy})`}>
          <rect
            x={sx - pw / 2}
            y={sy - ph / 2}
            width={pw}
            height={ph}
            rx={ph * 0.14}
            fill={palette.ink}
          />
          <Label
            x={sx}
            y={sy - ph * 0.04}
            text="hi,"
            size={ph * 0.36}
            weight={800}
            anchor="middle"
            maxWidth={pw * 0.86}
            fill={GREEN}
          />
          <Label
            x={sx}
            y={sy + ph * 0.3}
            text={`@${login}`}
            size={ph * 0.24}
            weight={700}
            anchor="middle"
            maxWidth={pw * 0.86}
            fill={GREEN}
          />
        </g>
        <g opacity={t}>
          <Label
            x={500}
            y={textY}
            text={`Ready for your ${year}?`}
            size={Math.min(70, head * 0.11)}
            weight={800}
            anchor="middle"
            maxWidth={900}
          />
        </g>
      </SceneSvg>
    </AbsoluteFill>
  );
}
