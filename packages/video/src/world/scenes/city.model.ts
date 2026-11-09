import type { RecapData } from "@wyg/schema";

export type CityModel = {
  total: number;
  final: boolean;
  /** Line above the total. A year still running says "so far". */
  headline: string;
  caption: string;
  /** Explains the "not yet" outlines; null once the year is complete. */
  legend: string | null;
};

/** The sign over the city: the year's contributions and whether the year is complete. */
export function cityModel(data: RecapData): CityModel {
  const final = data.meta.isFinal;
  return {
    total: data.contributions.total,
    final,
    headline: final ? "This year you made" : "This year so far you made",
    caption: "contributions · one building per day",
    legend: final ? null : "not yet: days still to come",
  };
}
