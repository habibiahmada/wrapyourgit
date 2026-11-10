import { AbsoluteFill, interpolate } from "remotion";
import { easeOut, palette } from "../../theme";
import { ARCHETYPE_NONE, archetypeModel, wrapLines } from "./archetype.model";
import {
  ArchetypeArt,
  CellArt,
  Label,
  labelFontSize,
  SceneSvg,
  safeArea,
  sceneHeight,
} from "./kit";
import type { SceneProps } from "./types";

const STAGE = "#17123A";
const FLOOR = "#2A2160";
const FLOOR_RIM = "#5B4FB5";
const BEAM = "#FFF1C2";
const GOLD = "#FFD84D";
/** Smallest reason size before it wraps to a second line instead. */
const REASON_FLOOR = 26;

export function Archetype({ data, size, layout, enter, frame }: SceneProps) {
  const model = archetypeModel(data);
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const wide = layout === "landscape";
  const t = easeOut(interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }));
  const bob = Math.sin(frame / 24) * 3;

  // Tall frames: title above, Cell large on the stage, reasons below. Landscape: Cell left, text right.
  const cellW = wide ? Math.min(520, h * 0.95) : Math.min(920, h * 0.52);
  const cellX = wide ? 250 : 500;
  const floorY = wide ? h * 0.8 : h * 0.68;
  const textX = wide ? 530 : 500;
  const anchor = wide ? "start" : "middle";
  const textW = wide ? 1000 - textX - 40 : 880;
  const rise = (1 - t) * 50;

  const introSize = wide ? 34 : 50;
  const titleSize = wide ? 100 : 160;
  const reasonSize = wide ? 32 : 48;
  const lead = reasonSize * 1.3;

  const textTop = wide ? h * 0.14 : safe.top + 70;
  const introY = textTop + introSize;
  const titleY = introY + titleSize * 1.05;

  // Spotlight: a cone and a narrower one inside it, solid translucent shapes (no gradients).
  const beamTop = wide ? 0 : safe.top * 0.4;
  const ellipseRx = wide ? 230 : 400;
  const cone = (k: number) =>
    `${cellX - 30 * k},${beamTop} ${cellX + 30 * k},${beamTop} ${cellX + ellipseRx * k},${floorY - 6} ${cellX - ellipseRx * k},${floorY - 6}`;

  const lines = (model ? model.reasons : [ARCHETYPE_NONE]).flatMap((r, ri) =>
    wrapLines(r, reasonSize, 700, textW, REASON_FLOOR).map((text, i) => ({
      text,
      key: `${ri}-${i}`,
      group: ri,
    })),
  );
  // One size for every line so the list reads as a list: the smallest any line needs.
  const lineSize = Math.min(
    reasonSize,
    ...lines.map((l) => labelFontSize(l.text, reasonSize, 700, textW)),
  );
  const reasonTop = wide ? titleY + 55 : floorY + 130;
  const noneTop = wide ? h * 0.42 : floorY + 130;
  const firstY = model ? reasonTop : noneTop;
  const reasonsT = (i: number) => easeOut(Math.min(1, Math.max(0, t * 1.6 - 0.4 - i * 0.12)));

  const alt = model
    ? `${model.intro} ${model.title}. ${model.reasons.map((r) => `${r}. `).join("")}Cell stands in the spotlight in the ${model.title} costume.`
    : `${ARCHETYPE_NONE}. Cell thinks alone in the spotlight.`;

  return (
    <AbsoluteFill style={{ backgroundColor: STAGE }}>
      <SceneSvg title={alt}>
        <polygon points={cone(1)} fill={BEAM} fillOpacity={0.07 * t} />
        <polygon points={cone(0.55)} fill={BEAM} fillOpacity={0.08 * t} />
        {[1, 0.78, 0.56].map((k, i) => (
          <ellipse
            key={k}
            cx={cellX}
            cy={floorY - 6}
            rx={ellipseRx * k}
            ry={(wide ? 34 : 52) * k}
            fill={i === 0 ? FLOOR : BEAM}
            fillOpacity={i === 0 ? 1 : 0.07}
            stroke={i === 0 ? FLOOR_RIM : "none"}
            strokeWidth={4}
          />
        ))}
        <g opacity={t}>
          {model && (
            <>
              <Label
                x={textX}
                y={introY}
                text={model.intro}
                size={introSize}
                weight={700}
                anchor={anchor}
                maxWidth={textW}
                fill={palette.paper}
              />
              <Label
                x={textX}
                y={titleY}
                text={model.title}
                size={titleSize}
                weight={800}
                anchor={anchor}
                maxWidth={textW}
                fill={GOLD}
              />
            </>
          )}
        </g>
        {lines.map((l, i) => (
          <g key={l.key} opacity={reasonsT(i)}>
            <Label
              x={textX}
              y={firstY + i * lead + l.group * lead * 0.4}
              text={l.text}
              size={lineSize}
              weight={700}
              anchor={anchor}
              maxWidth={textW}
              fill={palette.paper}
            />
          </g>
        ))}
      </SceneSvg>
      <div style={{ opacity: t }}>
        {model ? (
          <ArchetypeArt id={model.id} x={cellX} y={floorY + bob * t + rise} width={cellW} />
        ) : (
          <CellArt pose="think" x={cellX} y={floorY + bob * t + rise} width={cellW} />
        )}
      </div>
    </AbsoluteFill>
  );
}
