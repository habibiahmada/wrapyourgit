import type { RecapData } from "@wyg/schema";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Sfx } from "../components/Sfx";
import { Slam } from "../components/Slam";
import { calendarGrid, fitFontSize, heatLevels } from "../heat";
import { useLayout } from "../layout";
import { easeOut, formatCount, palette, useUnit } from "../theme";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Paper field. The year's graph draws in week by week (beats 1-7), then the busiest month
 * (beat 9) and the weekday pattern (beat 12). Facts with no data skip their beat.
 */
export function RhythmScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { calendar, busiestMonth, weekday } = data.contributions;

  const levels = heatLevels(calendar);
  const { cells, weeks } = calendarGrid(calendar);
  // Portrait stands the graph upright (weeks run down) so cells stay large on a tall frame.
  const vertical = layout === "portrait";
  const boxWidth = width * (layout === "landscape" ? 0.88 : 0.84);
  const boxHeight = height * 0.8;
  const cell = vertical
    ? Math.min(boxHeight / Math.max(weeks, 1), (boxWidth * 0.36) / 7)
    : Math.min(boxWidth / Math.max(weeks, 1), (boxHeight * 0.4) / 7);
  const gap = cell * 0.16;
  const revealedWeeks = interpolate(frame, [beats(1, fps), beats(7, fps)], [0, weeks], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const graph = (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: vertical ? cell * 7 : cell * weeks,
        height: vertical ? cell * weeks : cell * 7,
      }}
    >
      {cells.map(({ week, weekday: row }, i) => {
        const shown = Math.min(1, Math.max(0, revealedWeeks - week));
        if (shown === 0) return null;
        const level = levels[i] ?? 0;
        return (
          <div
            key={calendar[i]?.date}
            style={{
              position: "absolute",
              left: (vertical ? row : week) * cell,
              top: (vertical ? week : row) * cell,
              width: cell - gap,
              height: cell - gap,
              borderRadius: cell * 0.14,
              background: level > 0 ? palette.heat[level - 1] : palette.ink,
              opacity: level > 0 ? shown : shown * 0.08,
            }}
          />
        );
      })}
    </div>
  );

  const maxWeekday = Math.max(...weekday);
  const topWeekday = maxWeekday > 0 ? weekday.indexOf(maxWeekday) : -1;
  const barsGrow = interpolate(frame, [beats(12, fps), beats(14, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const barHeight = u * (layout === "landscape" ? 12 : 16);
  const barsWidth = u * (7 * 4.5 + 6 * 1.2);
  // Space the month name may take: beside the upright graph on portrait, beside the bars otherwise.
  const monthWidth = vertical ? boxWidth - cell * 7 - u * 6 : boxWidth - barsWidth - u * 6;

  const facts = (
    <div
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        justifyContent: vertical ? "center" : "space-between",
        alignItems: vertical ? "flex-start" : "flex-end",
        gap: u * 6,
        flex: 1,
        minWidth: 0,
      }}
    >
      {busiestMonth && (
        <div style={{ minWidth: 0 }}>
          <Slam at={beats(9, fps)} sound="land">
            <div
              style={{
                fontSize: fitFontSize(MONTHS[busiestMonth.month - 1] ?? "", monthWidth, u * 11),
                fontWeight: 800,
                lineHeight: 0.95,
                whiteSpace: "nowrap",
              }}
            >
              {MONTHS[busiestMonth.month - 1]}
            </div>
          </Slam>
          <Slam at={beats(10, fps)}>
            <div
              style={{ fontSize: u * 4.2, fontWeight: 700, color: palette.inkSoft, marginTop: u }}
            >
              busiest month · {formatCount(busiestMonth.count)} contributions
            </div>
          </Slam>
        </div>
      )}
      {topWeekday >= 0 && (
        <div>
          {/* The bars grow together; their notes climb Monday to Sunday. */}
          {weekday.map((_, day) => (
            <Sfx key={WEEKDAYS[day]} at={beats(12, fps) + day * 2} sound="blip" step={day} />
          ))}
          <div style={{ display: "flex", alignItems: "flex-end", gap: u * 1.2, height: barHeight }}>
            {weekday.map((count, day) => (
              <div
                key={WEEKDAYS[day]}
                style={{
                  width: u * 4.5,
                  height: Math.max(u * 0.6, (count / maxWeekday) * barHeight * barsGrow),
                  borderRadius: u * 0.6,
                  background: day === topWeekday ? palette.heat[1] : palette.ink,
                }}
              />
            ))}
          </div>
          <Slam at={beats(14, fps)}>
            <div
              style={{
                fontSize: u * 4.2,
                fontWeight: 700,
                color: palette.inkSoft,
                marginTop: u * 1.5,
              }}
            >
              most active on {WEEKDAYS[topWeekday]}s
            </div>
          </Slam>
        </div>
      )}
    </div>
  );

  return (
    <Field
      color="paper"
      style={{
        flexDirection: vertical ? "row" : "column",
        justifyContent: "space-between",
        gap: u * 6,
      }}
    >
      {vertical ? graph : <div style={{ alignSelf: "center" }}>{graph}</div>}
      {facts}
      {/* The year draws in over six beats: one shimmer as it starts, a softer one halfway. */}
      <Sfx at={beats(1, fps)} sound="shimmer" />
      <Sfx at={beats(4, fps)} sound="shimmer" volume={0.25} />
    </Field>
  );
}
