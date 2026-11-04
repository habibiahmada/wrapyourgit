import type { RecapData } from "@wyg/schema";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { heatLevels } from "../heat";
import { useLayout } from "../layout";
import { palette, useUnit } from "../theme";

/** Ink field. The user's first week of the year lights up cell by cell, then the title lands. */
export function IntroScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const firstWeek = heatLevels(data.contributions.calendar).slice(0, 7);
  const cell = u * (layout === "landscape" ? 7 : 8);
  const title = u * (layout === "portrait" ? 12 : 10.5);

  const week = (
    <div
      style={{
        display: "flex",
        flexDirection: layout === "landscape" ? "column" : "row",
        gap: cell * 0.18,
      }}
    >
      {Array.from({ length: 7 }, (_, i) => {
        const level = firstWeek[i] ?? 0;
        // Cells light on half-beats across the first four beats, before the title lands.
        const lit = interpolate(frame, [i * beats(0.5, fps), i * beats(0.5, fps) + 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: seven fixed weekday cells, index is the weekday
            key={i}
            style={{
              width: cell,
              height: cell,
              borderRadius: cell * 0.12,
              background: level > 0 ? palette.heat[level - 1] : palette.paper,
              opacity: level > 0 ? lit : lit * 0.14,
              transform: `scale(${0.6 + 0.4 * lit})`,
            }}
          />
        );
      })}
    </div>
  );

  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: u * 2 }}>
      <Slam at={beats(4, fps)}>
        <div style={{ fontSize: u * 4.5, fontWeight: 700 }}>
          @{data.profile.login} · {data.meta.year}
        </div>
      </Slam>
      <div style={{ fontSize: title, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.02em" }}>
        <Slam at={beats(5, fps)}>Every green</Slam>
        <Slam at={beats(5.5, fps)}>square has</Slam>
        <Slam at={beats(6, fps)}>a story.</Slam>
      </div>
    </div>
  );

  return (
    <Field
      color="ink"
      style={{
        flexDirection: layout === "landscape" ? "row" : "column",
        justifyContent: layout === "landscape" ? "flex-start" : "space-between",
        alignItems: layout === "landscape" ? "center" : "flex-start",
        gap: u * 8,
      }}
    >
      {week}
      {text}
    </Field>
  );
}
