import type { RecapData } from "@wyg/schema";

export type CityModel = { total: number; final: boolean };

/** The sign over the city: the year's contributions and whether the year is complete. */
export function cityModel(data: RecapData): CityModel {
  return { total: data.contributions.total, final: data.meta.isFinal };
}
