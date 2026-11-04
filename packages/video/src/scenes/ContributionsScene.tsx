import type { RecapData } from "@wyg/schema";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { fitFontSize } from "../heat";
import { useLayout } from "../layout";
import { easeOut, formatCount, palette, useUnit } from "../theme";

/**
 * Persimmon field, ink text. The total counts up from beat 1 to beat 4 and then holds for the
 * rest of the scene (well over the 1.5 s rule); the two supporting facts land on beats 6 and 8.
 */
export function ContributionsScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { total, activeDays, longestStreak } = data.contributions;

  const counted = Math.round(
    interpolate(frame, [beats(1, fps), beats(4, fps)], [0, total], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOut,
    }),
  );
  const finalText = formatCount(total);
  const boxWidth = width * (layout === "landscape" ? 0.46 : 0.84);
  const numberSize = fitFontSize(finalText, boxWidth, u * (layout === "landscape" ? 34 : 32));
  const label = data.meta.isFinal
    ? `contributions in ${data.meta.year}`
    : `contributions so far in ${data.meta.year}`;

  const facts = [
    { at: beats(6, fps), text: `${activeDays.toLocaleString("en-US")} active days`, lit: false },
    longestStreak.days > 0
      ? { at: beats(8, fps), text: `${longestStreak.days}-day longest streak`, lit: true }
      : null,
  ].filter((fact) => fact !== null);

  return (
    <Field
      color="persimmon"
      style={{
        flexDirection: layout === "landscape" ? "row" : "column",
        justifyContent: "space-between",
        alignItems: layout === "landscape" ? "center" : "stretch",
      }}
    >
      <div>
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
          {formatCount(counted)}
        </div>
        <Slam at={beats(0.5, fps)}>
          <div style={{ fontSize: u * 5.5, fontWeight: 700, marginTop: u * 2 }}>{label}</div>
        </Slam>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: layout === "landscape" ? "stretch" : "flex-end",
          gap: u * 2,
          flexShrink: 0,
          marginTop: layout === "landscape" ? 0 : height * 0.02,
        }}
      >
        {facts.map((fact) => (
          <Slam key={fact.text} at={fact.at} from="left">
            <div
              style={{
                background: palette.ink,
                color: palette.paper,
                fontSize: u * (layout === "landscape" ? 5 : 6),
                fontWeight: 700,
                padding: `${u * 1.6}px ${u * 3}px`,
                borderRadius: u * 0.8,
                display: "flex",
                alignItems: "center",
                gap: u * 2,
                whiteSpace: "nowrap",
              }}
            >
              {fact.lit && (
                <span
                  style={{
                    width: u * 4,
                    height: u * 4,
                    borderRadius: u * 0.5,
                    background: palette.cell,
                    flexShrink: 0,
                  }}
                />
              )}
              {fact.text}
            </div>
          </Slam>
        ))}
      </div>
    </Field>
  );
}
