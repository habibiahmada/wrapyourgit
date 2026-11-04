import type { RecapData } from "@wyg/schema";

/*
 * This year against the same span of last year, as small multiples: one panel per measure, each
 * on its own scale, because contributions and reviews differ by orders of magnitude and must
 * never share an axis. Two series in a fixed order (this year GitHub green, last year blue,
 * validated with the dataviz palette checks on the dark surface), always labelled in text, so colour is
 * never the only cue.
 */

const THIS = "#26a641";
const LAST = "#4493f8";

const n = (value: number) => value.toLocaleString("en-US");

function change(now: number, before: number): string {
  if (now === before) return "Same as last year";
  const diff = now - before;
  const sign = diff > 0 ? "+" : "−";
  const pct = before > 0 ? ` (${sign}${Math.round((Math.abs(diff) / before) * 100)}%)` : "";
  return `${sign}${n(Math.abs(diff))}${pct} ${diff > 0 ? "more" : "fewer"} than last year`;
}

function Panel({
  label,
  now,
  before,
  years,
}: {
  label: string;
  now: number;
  before: number;
  years: [string, string];
}) {
  const max = Math.max(now, before, 1);
  const bars = [
    { year: years[0], value: now, color: THIS },
    { year: years[1], value: before, color: LAST },
  ];
  return (
    <li className="reveal-zoom rounded-xl border border-line bg-surface p-5">
      <h3 className="font-semibold">{label}</h3>
      <p className="mt-1 text-sm text-muted">{change(now, before)}</p>
      <div className="mt-4 flex flex-col gap-[2px]">
        {bars.map((bar) => (
          <div key={bar.year} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
            <span className="text-sm text-muted">{bar.year}</span>
            <div className="flex items-center gap-2">
              <span
                title={`${bar.year}: ${n(bar.value)}`}
                className="h-5 rounded-r-[4px]"
                style={{
                  width: `${Math.max(2, (bar.value / max) * 100)}%`,
                  background: bar.color,
                }}
              />
              <span className="text-base font-semibold tabular-nums">{n(bar.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </li>
  );
}

export function YearComparison({ data }: { data: RecapData }) {
  const { previousYear, contributions, engineering, repositories, meta } = data;
  if (previousYear.status !== "ok") {
    return (
      <p className="max-w-2xl text-muted">
        Last year couldn't be read from GitHub this time. Sync again later to see how {meta.year}{" "}
        compares.
      </p>
    );
  }
  const last = previousYear.value;
  const span = last.sameSpan;
  const years: [string, string] = meta.isFinal
    ? [String(meta.year), String(last.year)]
    : [`${meta.year} so far`, `${last.year} same span`];
  const panels = [
    { label: "Contributions", now: contributions.total, before: span.contributions },
    { label: "Active days", now: contributions.activeDays, before: span.activeDays },
    {
      label: "Longest streak (days)",
      now: contributions.longestStreak.days,
      before: span.longestStreak,
    },
    { label: "Commits", now: contributions.commits, before: span.commits },
    { label: "Pull requests", now: engineering.prsOpened, before: span.pullRequests },
    { label: "Reviews", now: engineering.reviews, before: span.reviews },
    { label: "Issues", now: engineering.issuesOpened, before: span.issues },
    {
      label: "Repositories you committed to",
      now: repositories.contributedTo,
      before: span.reposWithCommits,
    },
    ...(contributions.privateCount.status === "ok"
      ? [
          {
            label: "Private contributions",
            now: contributions.privateCount.value,
            before: span.privateCount,
          },
        ]
      : []),
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted" aria-hidden>
        <span className="flex items-center gap-2">
          <span className="size-4 rounded-[3px]" style={{ background: THIS }} /> {years[0]}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-4 rounded-[3px]" style={{ background: LAST }} /> {years[1]}
        </span>
      </div>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {panels.map((panel) => (
          <Panel key={panel.label} {...panel} years={years} />
        ))}
      </ul>
      <p className="mt-8 max-w-3xl text-muted">
        All of {last.year}: {n(last.fullYear.contributions)} contributions on{" "}
        {n(last.fullYear.activeDays)} days, with a longest streak of {last.fullYear.longestStreak}{" "}
        days.
        {!meta.isFinal && ` Last year's span runs to ${span.through}, the same day as this recap.`}
      </p>
    </>
  );
}
