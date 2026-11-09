import type { CalendarDay } from "@wyg/schema";

/** Days with at least one contribution. */
export function countActiveDays(calendar: readonly CalendarDay[]): number {
  return calendar.filter((day) => day.count > 0).length;
}

/**
 * Longest run of consecutive active calendar days.
 * Expects one entry per day in ascending order (GitHub's contribution calendar shape);
 * gaps in the input are treated as inactive days.
 */
export function longestStreak(calendar: readonly CalendarDay[]): {
  days: number;
  start: string | null;
  end: string | null;
} {
  let best = { days: 0, start: null as string | null, end: null as string | null };
  let runStart: string | null = null;
  let runDays = 0;
  let prevDate: string | null = null;

  for (const day of calendar) {
    const contiguous = prevDate !== null && addDays(prevDate, 1) === day.date;
    if (day.count > 0) {
      if (runDays > 0 && contiguous) {
        runDays += 1;
      } else {
        runStart = day.date;
        runDays = 1;
      }
      if (runDays > best.days) best = { days: runDays, start: runStart, end: day.date };
    } else {
      runDays = 0;
    }
    prevDate = day.date;
  }
  return best;
}

/** Contribution totals per month (index 0 = January). */
export function monthlyTotals(calendar: readonly CalendarDay[]): number[] {
  const months = Array<number>(12).fill(0);
  for (const day of calendar) {
    const month = Number(day.date.slice(5, 7)) - 1;
    months[month] = (months[month] ?? 0) + day.count;
  }
  return months;
}

/** Month (1-12) with the most contributions; null when the year is empty. Ties go to the earlier month. */
export function busiestMonth(
  calendar: readonly CalendarDay[],
): { month: number; count: number } | null {
  const months = monthlyTotals(calendar);
  let bestIndex = -1;
  let bestCount = 0;
  months.forEach((count, index) => {
    if (count > bestCount) {
      bestCount = count;
      bestIndex = index;
    }
  });
  return bestIndex === -1 ? null : { month: bestIndex + 1, count: bestCount };
}

/** Day with the most contributions; null when no day has any. Ties go to the earlier date. */
export function busiestDay(
  calendar: readonly CalendarDay[],
): { date: string; count: number } | null {
  let best: { date: string; count: number } | null = null;
  for (const { date, count } of calendar) {
    if (count <= 0) continue;
    if (!best || count > best.count || (count === best.count && date < best.date)) {
      best = { date, count };
    }
  }
  return best;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
