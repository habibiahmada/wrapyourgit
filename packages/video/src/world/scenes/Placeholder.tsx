import { AbsoluteFill } from "remotion";
import { fontFamily, formatCount, palette } from "../../theme";
import { contributionsLabel, formatDay } from "../fade";
import type { SceneProps } from "./types";

/** The phase 1 card: kind, date and (busiest) count. The city overview has no plot, so no card. */
export function Placeholder({ stop, city, size }: SceneProps) {
  const plot = stop.plot === null ? undefined : city.plots[stop.plot];
  if (!plot) return null;
  const unit = Math.min(size.width, size.height) / 100;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper, color: palette.ink, fontFamily }}>
      {/* Inset so the card's edge stays clear of the progress bar and the copyright line. */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          top: unit * 8,
          left: unit * 8,
          right: unit * 8,
          bottom: unit * 8,
          alignItems: "center",
          justifyContent: "center",
          gap: unit * 2,
          border: `${unit * 0.5}px solid ${palette.ink}`,
          borderRadius: unit * 3,
        }}
      >
        <div style={{ fontSize: unit * 11, fontWeight: 800, textTransform: "uppercase" }}>
          {stop.page ? `${stop.kind} ${stop.page}` : stop.kind}
        </div>
        <div style={{ fontSize: unit * 5, fontWeight: 400 }}>{formatDay(plot.date)}</div>
        {stop.kind === "busiest" && (
          <div style={{ fontSize: unit * 6, fontWeight: 700 }}>
            {contributionsLabel(plot.count, formatCount(plot.count))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
