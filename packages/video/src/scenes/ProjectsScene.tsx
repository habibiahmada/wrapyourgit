import type { RecapData } from "@wyg/schema";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { fitFontSize } from "../heat";
import { useLayout } from "../layout";
import { repoLabel } from "../present";
import { commitShares, SQUARES, shareLabel } from "../share";
import { formatCount, palette, useUnit } from "../theme";

/**
 * One colour per repository, in rank order: GitHub green for the top one, then cobalt, persimmon
 * and violet. Validated on paper (#F4EFE3) with the dataviz palette checks: lightness band,
 * chroma, colourblind separation and 3:1 contrast all pass. Every other repository is a faint
 * ink square, like an empty day on the contribution graph.
 */
const SERIES = ["#216E39", "#2B39C8", "#E4572E", "#7E57C2"] as const;
// Solid, so the silhouette behind never shows through and darkens some squares.
const OTHER = "#DEDACE";

/**
 * Paper field. The top repository is the headline (beats 0-2); then the year's commits fill a
 * 10 × 10 grid, one square per percent, coloured by repository (share.ts), while the legend
 * names each one with its commits and share. Private repos are never named (repoLabel).
 */
export function ProjectsScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { top, createdThisYear, contributedTo } = data.repositories;
  const [spotlight] = top;
  const side = layout === "landscape";
  const tall = layout === "portrait";

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

  const shares = commitShares(top, data.contributions.commits);
  const label = repoLabel(spotlight);
  const headWidth = width * (side ? 0.44 : 0.84);
  // 0.68 em: Bricolage at 800 runs wide. Below u*7 a name stops reading, so it ellipsizes instead.
  const nameSize = Math.max(
    u * 7,
    fitFontSize(label.name, headWidth, u * (side ? 12 : tall ? 15 : 13), 0.68),
  );
  const spotlightShare = shares.rows[0];

  // The grid: squares in rank order, each repository's run contiguous, filled row by row.
  const colours: string[] = [];
  shares.rows.forEach((row, i) => {
    for (let k = 0; k < row.squares; k += 1) colours.push(SERIES[i] ?? OTHER);
  });
  while (colours.length < SQUARES) colours.push(OTHER);
  const grid = u * (side ? 62 : tall ? 58 : 42);
  const pitch = grid / 10;
  const square = pitch * 0.84;
  const fillFrom = beats(3, fps);
  const fillSpan = beats(4, fps);

  const legend = [
    ...shares.rows.map((row, i) => ({
      key: row.item.nameWithOwner,
      colour: SERIES[i] ?? OTHER,
      name: repoLabel(row.item).name,
      commits: row.commits,
      share: shareLabel(row),
    })),
    ...(shares.other.commits > 0
      ? [
          {
            key: "other",
            colour: OTHER,
            name: "every other repository",
            commits: shares.other.commits,
            share: shareLabel(shares.other),
          },
        ]
      : []),
  ];

  const footer = [
    createdThisYear > 0 ? `${formatCount(createdThisYear)} new this year` : null,
    contributedTo > 0 ? `commits in ${formatCount(contributedTo)} repositories` : null,
  ].filter((part) => part !== null);

  const header = (
    <div style={{ minWidth: 0, maxWidth: headWidth }}>
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
        <div style={{ fontSize: u * 4, fontWeight: 700, color: palette.inkSoft, marginTop: u }}>
          {[
            `${formatCount(spotlight.commits)} commits`,
            spotlightShare ? `${shareLabel(spotlightShare)} of your year` : null,
            spotlight.primaryLanguage,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </Slam>
    </div>
  );

  const waffle = (
    <div
      role="img"
      aria-label={legend.map((row) => `${row.name} ${row.share}`).join(", ")}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(10, ${square}px)`,
        gap: pitch - square,
        width: grid,
        flexShrink: 0,
        alignSelf: side ? "center" : tall ? "center" : "flex-start",
      }}
    >
      {colours.map((colour, i) => {
        const at = fillFrom + Math.round((i / SQUARES) * fillSpan);
        const pop = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 200 } });
        const lit = colour !== OTHER;
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid, the index is the square
            key={i}
            style={{
              width: square,
              height: square,
              borderRadius: square * 0.2,
              background: lit && pop > 0.02 ? colour : OTHER,
              transform: lit ? `scale(${0.6 + 0.4 * pop})` : undefined,
            }}
          />
        );
      })}
    </div>
  );

  const legendList = (
    <div
      style={
        tall
          ? // Portrait: two columns under the grid, so five rows fit the height.
            {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: u * 4,
              rowGap: u * 2.6,
              minWidth: 0,
            }
          : { display: "flex", flexDirection: "column", gap: u * 2, minWidth: 0, flex: 1 }
      }
    >
      {legend.map((row, i) => (
        <Slam key={row.key} at={beats(3 + i, fps)} sound="blip" step={i * 2}>
          <div style={{ display: "flex", gap: u * 1.8, alignItems: "flex-start" }}>
            <div
              style={{
                width: u * 3.4,
                height: u * 3.4,
                borderRadius: u * 0.7,
                background: row.colour,
                flexShrink: 0,
                marginTop: u * 0.5,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: u * 3.8,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.name}
              </div>
              <div
                style={{
                  fontSize: u * 3.2,
                  fontWeight: 700,
                  color: palette.inkSoft,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatCount(row.commits)} commits · {row.share}
              </div>
            </div>
          </div>
        </Slam>
      ))}
    </div>
  );

  const notes = (
    <Slam at={beats(4 + legend.length, fps)}>
      <div style={{ fontSize: u * 3.4, fontWeight: 700, color: palette.inkSoft, lineHeight: 1.35 }}>
        {footer.length > 0 && <div>{footer.join(" · ")}</div>}
        <div>
          1 square = 1% of your {formatCount(shares.base)} commits in {data.meta.year}
        </div>
      </div>
    </Slam>
  );

  if (side) {
    return (
      <Field color="paper" style={{ flexDirection: "row", alignItems: "center", gap: u * 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: u * 4, minWidth: 0, flex: 1 }}>
          {header}
          {legendList}
          {notes}
        </div>
        {waffle}
      </Field>
    );
  }

  return (
    <Field color="paper" style={{ flexDirection: "column", gap: u * 5 }}>
      {header}
      {tall ? (
        <>
          {waffle}
          {legendList}
        </>
      ) : (
        <div style={{ display: "flex", gap: u * 5, alignItems: "flex-start" }}>
          {waffle}
          {legendList}
        </div>
      )}
      {notes}
    </Field>
  );
}
