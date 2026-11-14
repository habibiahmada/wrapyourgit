import type { RecapData } from "@wyg/schema";

/*
 * This year against the same span of last year, in one panel: a row per measure, each row on its
 * own scale, because contributions and reviews differ by orders of magnitude and must never share
 * an axis. Two series in a fixed order (this year GitHub green, last year blue, validated with the
 * dataviz palette checks on the dark surface), always labelled in text, so colour is never the
 * only cue. The two largest changes are said in words above it.
 */

const THIS = "#26a641";
const LAST = "#7f93ff";

const n = (value: number) => value.toLocaleString("en-US");

type Row = { label: string; noun: string; now: number; before: number };

/** "+1,022 (+24%)", or "Same" when nothing moved. */
function change(now: number, before: number): string {
  if (now === before) return "Same";
  const diff = now - before;
  const sign = diff > 0 ? "+" : "−";
  const pct = before > 0 ? ` (${sign}${Math.round((Math.abs(diff) / before) * 100)}%)` : "";
  return `${sign}${n(Math.abs(diff))}${pct}`;
}

/**
 * The changes worth a sentence: the two that moved most against last year, as a ratio. A measure
 * last year had fewer than ten of is left out, so going from 1 to 58 issues is not the headline.
 */
function headlines(rows: Row[], lastYear: number): string[] {
  return rows
    .filter((row) => row.before >= 10 && row.now !== row.before)
    .map((row) => ({ row, ratio: row.now / row.before }))
    .sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)))
    .slice(0, 2)
    .map(({ row, ratio }) => {
      if (ratio >= 2) {
        const times = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
        return `${times}× the ${row.noun} of ${lastYear}`;
      }
      const pct = Math.round(Math.abs(ratio - 1) * 100);
      return `${pct}% ${ratio > 1 ? "more" : "fewer"} ${row.noun} than ${lastYear}`;
    });
}

/**
 * The change as a coloured chip: green and an up arrow for more, amber and a down arrow for less
 * (amber, not red: a slower year is something to beat, not a failure). The arrow and the sign
 * carry the direction too, so colour is never the only cue. Both pass 4.5:1 on the surface.
 */
function Change({ now, before }: { now: number; before: number }) {
  const tone =
    now > before
      ? { cls: "bg-green/15 text-green", arrow: "▲" }
      : now < before
        ? { cls: "bg-[#d29922]/15 text-[#d29922]", arrow: "▼" }
        : { cls: "bg-overlay text-muted", arrow: "" };
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums ${tone.cls}`}
    >
      {tone.arrow && (
        <span aria-hidden className="text-xs">
          {tone.arrow}
        </span>
      )}
      {change(now, before)}
    </span>
  );
}

export function YearComparison({ data }: { data: RecapData }) {
  const { previousYear, contributions, engineering, repositories, meta } = data;
  if (previousYear.status !== "ok") {
    return (
      <p className="px-4 py-4 text-muted">
        Last year couldn't be read from GitHub this time. Sync again later to see how {meta.year}{" "}
        compares.
      </p>
    );
  }
  const last = previousYear.value;
  const span = last.sameSpan;
  const years: [string, string] = meta.isFinal
    ? [String(meta.year), String(last.year)]
    : [`${meta.year} so far`, `${last.year}, same span`];
  const rows: Row[] = [
    {
      label: "Contributions",
      noun: "contributions",
      now: contributions.total,
      before: span.contributions,
    },
    {
      label: "Active days",
      noun: "active days",
      now: contributions.activeDays,
      before: span.activeDays,
    },
    {
      label: "Longest streak (days)",
      noun: "days in your longest streak",
      now: contributions.longestStreak.days,
      before: span.longestStreak,
    },
    { label: "Commits", noun: "commits", now: contributions.commits, before: span.commits },
    {
      label: "Pull requests",
      noun: "pull requests",
      now: engineering.prsOpened,
      before: span.pullRequests,
    },
    { label: "Reviews", noun: "reviews", now: engineering.reviews, before: span.reviews },
    { label: "Issues", noun: "issues", now: engineering.issuesOpened, before: span.issues },
    {
      label: "Repositories you committed to",
      noun: "repositories committed to",
      now: repositories.contributedTo,
      before: span.reposWithCommits,
    },
    ...(contributions.privateCount.status === "ok"
      ? [
          {
            label: "Private contributions",
            noun: "private contributions",
            now: contributions.privateCount.value,
            before: span.privateCount,
          },
        ]
      : []),
  ];
  const said = headlines(rows, last.year);
  return (
    <>
      {said.length > 0 && (
        <ul className="grid gap-x-6 gap-y-1 border-b border-line px-4 py-3 sm:grid-cols-2">
          {said.map((line) => (
            <li key={line} className="font-semibold text-balance">
              {line}
            </li>
          ))}
        </ul>
      )}
      <div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-4 py-2 text-sm text-muted">
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-[3px]" style={{ background: THIS }} />{" "}
            {years[0]}
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-[3px]" style={{ background: LAST }} />{" "}
            {years[1]}
          </span>
        </div>
        <table className="w-full text-left">
          <caption className="sr-only">
            {meta.year} against the same span of {last.year}, measure by measure
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">{years[0]}</th>
              <th scope="col">{years[1]}</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const max = Math.max(row.now, row.before, 1);
              return (
                <tr
                  key={row.label}
                  className="grid gap-x-6 gap-y-1.5 px-4 py-3 md:grid-cols-[12rem_1fr_10rem] md:items-center"
                >
                  <th scope="row" className="text-sm font-semibold">
                    {row.label}
                  </th>
                  {[
                    { value: row.now, color: THIS, year: years[0] },
                    { value: row.before, color: LAST, year: years[1] },
                  ].map((bar) => (
                    <td key={bar.year} className="flex items-center gap-3 md:col-start-2">
                      <span
                        aria-hidden
                        className="h-2.5 rounded-r-[2px]"
                        style={{
                          width: `${Math.max(1, (bar.value / max) * 70)}%`,
                          background: bar.color,
                        }}
                      />
                      <span className="text-sm font-semibold tabular-nums">{n(bar.value)}</span>
                    </td>
                  ))}
                  <td className="md:col-start-3 md:row-span-2 md:row-start-1 md:text-right">
                    <Change now={row.now} before={row.before} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-3 text-sm text-muted">
        All of {last.year}: {n(last.fullYear.contributions)} contributions on{" "}
        {n(last.fullYear.activeDays)} days, with a longest streak of {last.fullYear.longestStreak}{" "}
        days.
        {!meta.isFinal && ` Last year's span runs to ${span.through}, the same day as this recap.`}
      </p>
    </>
  );
}
