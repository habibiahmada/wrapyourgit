import type { RecapData } from "@wyg/schema";
import { formatCount } from "../../theme";

export type RhythmCar = {
  day: string;
  count: number;
  /** Cargo height as a share of the busiest weekday's, 0 to 1. */
  fill: number;
  busiest: boolean;
};

export type RhythmModel = {
  cars: RhythmCar[];
  busiest: { day: string; count: number } | null;
  title: string;
  caption: string;
};

// Index 0 is Sunday, the order of `contributions.weekday`. Names are fixed, not locale-based.
const FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The seven cars and the busiest weekday (the earlier one on a tie); no busiest when all are 0. */
export function rhythmModel(data: RecapData): RhythmModel {
  const counts = FULL.map((_, i) => data.contributions.weekday[i] ?? 0);
  const max = Math.max(...counts);
  const top = max > 0 ? counts.indexOf(max) : -1;
  const cars = counts.map((count, i) => ({
    day: SHORT[i] ?? "",
    count,
    fill: max > 0 ? count / max : 0,
    busiest: i === top,
  }));
  if (top < 0) {
    return {
      cars,
      busiest: null,
      title: "Your week, so far",
      caption: "No contributions on any weekday yet",
    };
  }
  const day = FULL[top] ?? "";
  return {
    cars,
    busiest: { day, count: max },
    title: `${day}s carried the most`,
    caption: `contributions per weekday · ${day} ${formatCount(max)}`,
  };
}
