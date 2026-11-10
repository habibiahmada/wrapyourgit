import type { RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "../../copy";
import { formatDay } from "../fade";

export type ClosingModel = {
  /** The lead-in line, ending in "your" so the year follows it. */
  date: string;
  final: boolean;
  year: number;
  lines: string[];
};

/** "Nov 9": formatDay's fixed month name cut to three letters, so no locale is involved. */
function shortDay(iso: string): string {
  const [month = "", day = ""] = formatDay(iso).split(" ");
  return `${month.slice(0, 3)} ${day}`;
}

/** Copy for the closing scene: the headline numbers, and the archetype only when there is one. */
export function closingModel(data: RecapData): ClosingModel {
  const { meta, contributions, identity } = data;
  const { total, activeDays } = contributions;
  const lines = [
    `${total.toLocaleString("en-US")} ${total === 1 ? "contribution" : "contributions"}`,
    `${activeDays.toLocaleString("en-US")} active ${activeDays === 1 ? "day" : "days"}`,
  ];
  if (identity.archetype) lines.push(ARCHETYPE_LABELS[identity.archetype]);
  return {
    date: meta.isFinal
      ? "Dec 31. That was your"
      : `${shortDay(meta.periodEnd)}, so far. That's your`,
    final: meta.isFinal,
    year: meta.year,
    lines,
  };
}
