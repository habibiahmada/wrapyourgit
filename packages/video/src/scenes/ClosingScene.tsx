import type { RecapData } from "@wyg/schema";
import { useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { ARCHETYPE_LABELS } from "../copy";
import { calendarGrid, fitFontSize, heatLevels } from "../heat";
import { useLayout } from "../layout";
import { formatCount, palette, useUnit } from "../theme";

/**
 * Ink field over the outro. The whole year as a small graph, the four headline facts, and who
 * made it. No URL yet: the public recap page doesn't exist, and the video never points at a
 * page that isn't there.
 */
export function ClosingScene({ data }: { data: RecapData }) {
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { contributions, languages, identity, profile, meta } = data;

  const facts = [
    {
      label: meta.isFinal ? "contributions" : "contributions so far",
      value: formatCount(contributions.total),
    },
    contributions.activeDays > 0
      ? { label: "active days", value: formatCount(contributions.activeDays) }
      : null,
    languages.top[0] ? { label: "top language", value: languages.top[0].name } : null,
    identity.archetype ? { label: "archetype", value: ARCHETYPE_LABELS[identity.archetype] } : null,
  ].filter((fact) => fact !== null);

  const columns = layout === "portrait" ? 1 : 2;
  const columnWidth =
    (width * (layout === "landscape" ? 0.88 : 0.84) - u * 5 * (columns - 1)) / columns;
  const levels = heatLevels(contributions.calendar);
  const { cells, weeks } = calendarGrid(contributions.calendar);
  const cell = Math.min((width * 0.84) / Math.max(weeks, 1), u * 2.4);

  return (
    <Field
      color="ink"
      style={{ flexDirection: "column", justifyContent: "space-between", gap: u * 5 }}
    >
      <Slam at={0} sound={null}>
        <div style={{ fontSize: u * 5, fontWeight: 800 }}>
          @{profile.login} · {meta.year}
        </div>
      </Slam>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          rowGap: u * 3.5,
          columnGap: u * 5,
        }}
      >
        {facts.map((fact, index) => (
          <Slam key={fact.label} at={beats(1 + index, fps)}>
            <div style={{ fontSize: u * 3.8, fontWeight: 700 }}>{fact.label}</div>
            <div
              style={{
                fontSize: fitFontSize(fact.value, columnWidth, u * 9, 0.66),
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {fact.value}
            </div>
          </Slam>
        ))}
      </div>

      <div>
        <Slam at={beats(6, fps)} sound="shimmer">
          <div style={{ position: "relative", width: cell * weeks, height: cell * 7 }}>
            {cells.map(({ week, weekday }, i) => {
              const level = levels[i] ?? 0;
              return (
                <div
                  key={contributions.calendar[i]?.date}
                  style={{
                    position: "absolute",
                    left: week * cell,
                    top: weekday * cell,
                    width: cell * 0.84,
                    height: cell * 0.84,
                    borderRadius: cell * 0.16,
                    background: level > 0 ? palette.heat[level - 1] : palette.paper,
                    opacity: level > 0 ? 1 : 0.1,
                  }}
                />
              );
            })}
          </div>
        </Slam>
        <Slam at={beats(8, fps)} sound="land">
          <div style={{ fontSize: u * 3.8, fontWeight: 700, marginTop: u * 3 }}>
            Made with WrapYourGit
          </div>
        </Slam>
      </div>
    </Field>
  );
}
