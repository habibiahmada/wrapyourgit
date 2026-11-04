import type { RecapData } from "@wyg/schema";
import { useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { useCountUp } from "../components/useCountUp";
import { fitFontSize } from "../heat";
import { useLayout } from "../layout";
import { metricValue, repoLabel } from "../present";
import { formatCount, palette, useUnit } from "../theme";

/**
 * Cobalt field, paper text. Leads with stars gained this year; when GitHub didn't allow counting
 * them, it says "stars across your projects" instead. Gains and current totals are never mixed
 * under one label (metrics.md copy rule).
 */
export function CommunityScene({ data }: { data: RecapData }) {
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { starsGained, forksGained, totalStars, mostStarred } = data.community;
  const year = data.meta.year;

  const gained = metricValue(starsGained, formatCount);
  const lead =
    starsGained.status === "ok" && starsGained.value > 0
      ? {
          value: starsGained.value,
          label: `stars gained in ${year}`,
          estimated: starsGained.estimated,
        }
      : totalStars > 0
        ? { value: totalStars, label: "stars across your projects", estimated: false }
        : null;
  const counted = useCountUp(lead?.value ?? 0, beats(1, fps), beats(3, fps));

  if (!lead) {
    return (
      <Field color="cobalt" style={{ alignItems: "center" }}>
        <Slam at={beats(1, fps)}>
          <div style={{ fontSize: u * 9, fontWeight: 800, lineHeight: 1 }}>
            No stars on your projects yet.
          </div>
        </Slam>
      </Field>
    );
  }

  const leadText = `${lead.estimated ? "~" : ""}${formatCount(lead.value)}`;
  const numberSize = fitFontSize(leadText, width * (layout === "landscape" ? 0.5 : 0.84), u * 30);
  const forks = metricValue(forksGained, formatCount);
  const starred = mostStarred && mostStarred.stars > 0 ? mostStarred : null;
  const facts = [
    forks && forksGained.status === "ok" && forksGained.value > 0
      ? `${forks.text} new ${forksGained.value === 1 ? "fork" : "forks"} this year`
      : null,
    starred ? `most starred: ${repoLabel(starred).name} · ${formatCount(starred.stars)}` : null,
  ].filter((fact) => fact !== null);

  return (
    <Field
      color="cobalt"
      style={{
        flexDirection: layout === "landscape" ? "row" : "column",
        justifyContent: "space-between",
        alignItems: layout === "landscape" ? "flex-end" : "stretch",
        gap: u * 6,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: u * 3 }}>
          <div
            style={{
              fontSize: numberSize,
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {lead.estimated ? "~" : ""}
            {formatCount(counted)}
          </div>
          {/* The scene's one lit cell (DESIGN.md): green on cobalt is a non-text mark (4.21:1). */}
          <div
            style={{
              width: u * 6,
              height: u * 6,
              borderRadius: u * 0.8,
              background: palette.cell,
              flexShrink: 0,
            }}
          />
        </div>
        <Slam at={beats(0.5, fps)}>
          <div style={{ fontSize: u * 5.5, fontWeight: 700, marginTop: u * 2 }}>{lead.label}</div>
        </Slam>
        {lead.estimated && (
          <Slam at={beats(4, fps)}>
            <div style={{ fontSize: u * 3, marginTop: u * 1.5, maxWidth: u * 70 }}>
              ~ At least this many: for very popular repos only the newest stars were counted.
            </div>
          </Slam>
        )}
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: u * 2, alignItems: "flex-start" }}
      >
        {facts.map((fact, index) => (
          <Slam key={fact} at={beats(5 + index * 2, fps)} from="left">
            <div
              style={{
                background: palette.paper,
                color: palette.ink,
                fontSize: u * 5,
                fontWeight: 700,
                padding: `${u * 1.4}px ${u * 2.6}px`,
                borderRadius: u * 0.8,
                whiteSpace: "nowrap",
              }}
            >
              {fact}
            </div>
          </Slam>
        ))}
        {gained === null && lead.label !== `stars gained in ${year}` && (
          <Slam at={beats(5 + facts.length * 2, fps)}>
            <div style={{ fontSize: u * 3, maxWidth: u * 70 }}>
              Stars gained this year need extra GitHub access, so this shows your current total.
            </div>
          </Slam>
        )}
      </div>
    </Field>
  );
}
