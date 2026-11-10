import type { RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "../../copy";
import { formatCount } from "../../theme";
import { shortDay } from "../fade";

export type ClosingModel = {
  /** The lead-in line, ending in "your" so the year follows it. */
  date: string;
  final: boolean;
  year: number;
  lines: string[];
};

/** Copy for the closing scene: the headline numbers, and the archetype only when there is one. */
export function closingModel(data: RecapData): ClosingModel {
  const { meta, contributions, identity } = data;
  const { total, activeDays } = contributions;
  const lines = [
    `${formatCount(total)} ${total === 1 ? "contribution" : "contributions"}`,
    `${formatCount(activeDays)} active ${activeDays === 1 ? "day" : "days"}`,
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
