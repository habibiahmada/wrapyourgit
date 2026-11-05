import type { RecapData } from "@wyg/schema";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { fitFontSize } from "../heat";
import { useLayout } from "../layout";
import { repoLabel } from "../present";
import { formatCount, palette, useUnit } from "../theme";

const CELLS = 20;

/**
 * Paper field. The top repository is the spotlight (beat 1); the rest follow one per beat as rows
 * whose cells are scaled to the top repo's commits. Private repos are never named (repoLabel).
 */
export function ProjectsScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { top, createdThisYear, contributedTo } = data.repositories;
  const [spotlight, ...rest] = top;
  const side = layout === "landscape";

  if (!spotlight) {
    return (
      <Field color="paper" style={{ alignItems: "center" }}>
        <Slam at={beats(1, fps)}>
          <div style={{ fontSize: u * 9, fontWeight: 800, lineHeight: 1 }}>
            No repository commits in {data.meta.year} yet.
          </div>
        </Slam>
      </Field>
    );
  }

  const label = repoLabel(spotlight);
  const spotlightWidth = width * (side ? 0.4 : 0.84);
  // 0.68 em: Bricolage at 800 runs wide. Below u*7 a name stops reading, so it ellipsizes instead.
  const nameSize = Math.max(
    u * 7,
    fitFontSize(label.name, spotlightWidth, u * (side ? 13 : 15), 0.68),
  );
  const cell = u * (side ? 2.2 : 2.6);
  const footer = [
    createdThisYear > 0 ? `${formatCount(createdThisYear)} new this year` : null,
    contributedTo > 0 ? `commits in ${formatCount(contributedTo)} repositories` : null,
  ].filter((part) => part !== null);

  return (
    <Field
      color="paper"
      style={{
        flexDirection: side ? "row" : "column",
        justifyContent: "space-between",
        alignItems: side ? "center" : "stretch",
        gap: u * 6,
      }}
    >
      <div style={{ minWidth: 0, maxWidth: spotlightWidth }}>
        <Slam at={0} sound={null}>
          <div style={{ fontSize: u * 4.5, fontWeight: 700 }}>your top repository</div>
        </Slam>
        <Slam at={beats(1, fps)} sound="land">
          <div
            style={{
              fontSize: nameSize,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label.name}
          </div>
        </Slam>
        <Slam at={beats(2, fps)}>
          <div style={{ fontSize: u * 4.2, fontWeight: 700, color: palette.inkSoft, marginTop: u }}>
            {[label.owner, `${formatCount(spotlight.commits)} commits`, spotlight.primaryLanguage]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </Slam>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: u * 2.2, flexShrink: 0 }}>
        {rest.map((repo, index) => {
          const at = beats(4 + index, fps);
          const filled = Math.max(1, Math.round((repo.commits / spotlight.commits) * CELLS));
          const progress = interpolate(frame, [at, at + beats(1, fps)], [0, filled], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const { name } = repoLabel(repo);
          return (
            <div
              key={repo.nameWithOwner}
              style={{ display: "flex", flexDirection: "column", gap: u * 0.8 }}
            >
              {/* Each row fills on its beat; the notes climb down the list. */}
              <Slam at={at} sound="blip" step={index * 2}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: u * 3,
                    fontSize: u * 4,
                    fontWeight: 700,
                    width: CELLS * cell * 1.2,
                  }}
                >
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {name}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCount(repo.commits)}
                  </span>
                </div>
              </Slam>
              <div style={{ display: "flex", gap: cell * 0.2 }}>
                {Array.from({ length: CELLS }, (_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed row of cells, index is the position
                    key={i}
                    style={{
                      width: cell,
                      height: cell,
                      borderRadius: cell * 0.14,
                      background: palette.ink,
                      opacity: Math.min(1, Math.max(0, progress - i)) > 0 ? 1 : 0.08,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {footer.length > 0 && (
          <Slam at={beats(4 + rest.length + 1, fps)}>
            <div style={{ fontSize: u * 4, fontWeight: 700, color: palette.inkSoft }}>
              {footer.join(" · ")}
            </div>
          </Slam>
        )}
      </div>
    </Field>
  );
}
