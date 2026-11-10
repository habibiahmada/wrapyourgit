import type { RecapData } from "@wyg/schema";

export type SeesawModel =
  | {
      last: { year: number; value: number };
      current: { year: number; value: number };
      /** Degrees, clockwise positive: this year (right pan) heavier tips the beam right. */
      angle: number;
      change: string;
      span: string;
    }
  | { unavailable: true };

/** The beam never tilts past this, so a huge gap still reads as a seesaw, not a ramp. */
export const MAX_TILT = 12;

// Fixed names so a render never depends on the host's locale.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDay(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1] ?? ""} ${Number(iso.slice(8, 10))}`;
}

function changeText(last: number, current: number): string {
  if (last === 0) return current === 0 ? "same as last year" : "new this year";
  const percent = ((current - last) / last) * 100;
  if (Math.abs(percent) < 1) return "same as last year";
  const rounded = Math.round(Math.abs(percent));
  return `${percent > 0 ? "+" : "−"}${rounded}%`;
}

/**
 * Last year's contributions for the same span against this year's total. The recap's own period
 * runs from `periodStart` to `periodEnd`, the same day of the year `sameSpan.through` stops on
 * (schema `previousYear`), so `contributions.total` is the like-for-like figure.
 */
export function seesawModel(data: RecapData): SeesawModel {
  const prev = data.previousYear;
  if (prev.status !== "ok") return { unavailable: true };
  const last = prev.value.sameSpan.contributions;
  const current = data.contributions.total;
  const max = Math.max(last, current);
  const raw = max > 0 ? (MAX_TILT * (current - last)) / max : 0;
  return {
    last: { year: prev.value.year, value: last },
    current: { year: data.meta.year, value: current },
    angle: Math.max(-MAX_TILT, Math.min(MAX_TILT, raw)),
    change: changeText(last, current),
    span: `${shortDay(data.meta.periodStart)} – ${shortDay(prev.value.sameSpan.through)}, both years`,
  };
}
