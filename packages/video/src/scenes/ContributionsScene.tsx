import type { RecapData } from "@wyg/schema";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "../layout";
import { theme } from "../theme";

export function ContributionsScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const { total, activeDays, longestStreak } = data.contributions;
  const counted = Math.round(
    interpolate(frame, [0, fps * 1.5], [0, total], { extrapolateRight: "clamp" }),
  );
  const big = width * (layout === "landscape" ? 0.12 : 0.2);

  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        color: theme.foreground,
        fontFamily: theme.fontSans,
        justifyContent: "center",
        alignItems: "center",
        gap: big * 0.2,
        flexDirection: layout === "landscape" ? "row" : "column",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: big,
            fontWeight: 800,
            color: theme.accent,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {counted.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: big * 0.16, color: theme.muted }}>contributions</div>
      </div>
      <div style={{ fontSize: big * 0.18, lineHeight: 1.5 }}>
        <div>{activeDays} active days</div>
        <div>{longestStreak.days}-day longest streak</div>
      </div>
    </AbsoluteFill>
  );
}
