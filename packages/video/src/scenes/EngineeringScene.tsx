import type { RecapData } from "@wyg/schema";
import { useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { useCountUp } from "../components/useCountUp";
import { useLayout } from "../layout";
import { formatCount, palette, useUnit } from "../theme";

interface Counter {
  label: string;
  value: number;
  estimated: boolean;
}

/**
 * Ink field, paper text. Each non-zero counter lands on its own beat and counts up. Unavailable
 * metrics and zeros are left out rather than shown as 0; estimates carry "~" and a footnote.
 * Merged PRs are the one green number (green text is allowed on ink, 9.40:1).
 */
export function EngineeringScene({ data }: { data: RecapData }) {
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { prsOpened, prsMerged, issuesOpened, issuesClosed, reviews, externalRepos } =
    data.engineering;

  const counters: Counter[] = [
    { label: "pull requests", value: prsOpened, estimated: false },
    prsMerged.status === "ok"
      ? { label: "merged", value: prsMerged.value, estimated: prsMerged.estimated }
      : null,
    { label: "reviews", value: reviews, estimated: false },
    { label: "issues opened", value: issuesOpened, estimated: false },
    issuesClosed.status === "ok"
      ? { label: "issues closed", value: issuesClosed.value, estimated: issuesClosed.estimated }
      : null,
    { label: "repos you don't own", value: externalRepos, estimated: false },
  ].filter((counter): counter is Counter => counter !== null && counter.value > 0);

  if (counters.length === 0) {
    return (
      <Field color="ink" style={{ alignItems: "center" }}>
        <Slam at={beats(1, fps)}>
          <div style={{ fontSize: u * 9, fontWeight: 800, lineHeight: 1 }}>
            No pull requests, reviews or issues this year.
          </div>
        </Slam>
      </Field>
    );
  }

  const columns = layout === "portrait" ? 2 : 3;
  const anyEstimated = counters.some((counter) => counter.estimated);

  return (
    <Field color="ink" style={{ flexDirection: "column", justifyContent: "center", gap: u * 5 }}>
      <Slam at={0}>
        <div style={{ fontSize: u * 4.5, fontWeight: 700 }}>your engineering footprint</div>
      </Slam>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: u * 4,
          rowGap: u * 5,
        }}
      >
        {counters.map((counter, index) => (
          <CounterCell key={counter.label} counter={counter} at={beats(1 + index * 1.5, fps)} />
        ))}
      </div>
      {anyEstimated && (
        <Slam at={beats(2 + counters.length * 1.5, fps)}>
          <div style={{ fontSize: u * 3 }}>
            ~ At least this many: GitHub didn&apos;t share details for some private items.
          </div>
        </Slam>
      )}
    </Field>
  );
}

function CounterCell({ counter, at }: { counter: Counter; at: number }) {
  const { fps } = useVideoConfig();
  const u = useUnit();
  const value = useCountUp(counter.value, at, at + beats(2, fps));
  return (
    <Slam at={at}>
      <div
        style={{
          fontSize: u * 13,
          fontWeight: 800,
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          color: counter.label === "merged" ? palette.cell : palette.paper,
          whiteSpace: "nowrap",
        }}
      >
        {counter.estimated ? "~" : ""}
        {formatCount(value)}
      </div>
      <div style={{ fontSize: u * 4, fontWeight: 700, marginTop: u * 0.6 }}>{counter.label}</div>
    </Slam>
  );
}
