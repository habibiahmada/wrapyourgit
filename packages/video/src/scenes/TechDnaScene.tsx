import type { RecapData } from "@wyg/schema";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { LanguageMark } from "../components/LanguageMark";
import { Slam } from "../components/Slam";
import { fitFontSize } from "../heat";
import { useLayout } from "../layout";
import { palette, useUnit } from "../theme";

/** One cell = 5% of the year's commits, so a full row of 20 cells is 100%. */
const CELLS_PER_ROW = 20;

const percent = (share: number) => (share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`);

/**
 * Cobalt field, paper text. The top language lands on beat 1; each language then fills its row
 * of cells on successive beats. Green cells mark the top language only (non-text, 4.21:1 on cobalt).
 */
export function TechDnaScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const languages = data.languages.top;
  const top = languages[0];

  if (!top) {
    return (
      <Field color="cobalt" style={{ alignItems: "center" }}>
        <Slam at={beats(1, fps)}>
          <div style={{ fontSize: u * 9, fontWeight: 800, lineHeight: 1 }}>
            No language data for {data.meta.year} yet.
          </div>
        </Slam>
      </Field>
    );
  }

  const side = layout === "landscape";
  const nameWidth = width * (side ? 0.4 : 0.84);
  const nameSize = fitFontSize(top.name, nameWidth, u * (side ? 18 : 20), 0.6);
  const cell = u * (side ? 2.6 : 3.2);

  const rows = languages.map((language, index) => {
    const at = beats(3 + index, fps);
    const filled = Math.max(1, Math.round(language.share * CELLS_PER_ROW));
    const progress = interpolate(frame, [at, at + beats(1, fps)], [0, filled], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div key={language.name} style={{ display: "flex", flexDirection: "column", gap: u * 0.8 }}>
        {/* Each row fills on its beat; the notes climb down the list. */}
        <Slam at={at} sound="blip" step={index * 2}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: u * 2,
              fontSize: u * 4.2,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: u * 1.4,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <LanguageMark name={language.name} color={language.color} size={u * 5} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {language.name}
              </span>
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{percent(language.share)}</span>
          </div>
        </Slam>
        <div style={{ display: "flex", gap: cell * 0.2 }}>
          {Array.from({ length: CELLS_PER_ROW }, (_, i) => {
            const fill = Math.min(1, Math.max(0, progress - i));
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed row of 20 cells, index is the position
                key={i}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: cell * 0.14,
                  background: index === 0 ? palette.cell : palette.paper,
                  opacity: fill > 0 ? fill : 0.16,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  });

  return (
    <Field
      color="cobalt"
      style={{
        flexDirection: side ? "row" : "column",
        justifyContent: "space-between",
        alignItems: side ? "center" : "stretch",
        gap: u * 6,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Slam at={0} sound={null}>
          <div style={{ fontSize: u * 4.5, fontWeight: 700 }}>your top language</div>
        </Slam>
        <Slam at={beats(1, fps)} sound="land">
          <div style={{ margin: `${u * 2}px 0`, transform: "rotate(-6deg)", width: "fit-content" }}>
            <LanguageMark name={top.name} color={top.color} size={u * (side ? 16 : 18)} />
          </div>
        </Slam>
        <Slam at={beats(1, fps)} sound={null}>
          <div
            style={{
              fontSize: nameSize,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
            }}
          >
            {top.name}
          </div>
        </Slam>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: u * 2.4, flexShrink: 0 }}>
        {rows}
        <Slam at={beats(3 + languages.length + 1, fps)}>
          <div style={{ fontSize: u * 3, fontWeight: 400, maxWidth: CELLS_PER_ROW * cell * 1.2 }}>
            Share of your commits, weighted by the languages in each repo.
          </div>
        </Slam>
      </div>
    </Field>
  );
}
