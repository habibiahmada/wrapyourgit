import type { RecapData } from "@wyg/schema";

export type PrivateModel =
  | { kind: "count"; count: number; estimated: boolean }
  | { kind: "none" }
  | { kind: "unavailable" };

/** Unavailable is its own state: a count GitHub would not give is never shown as zero. */
export function privateModel(data: RecapData): PrivateModel {
  const metric = data.contributions.privateCount;
  if (metric.status === "unavailable") return { kind: "unavailable" };
  if (metric.value === 0) return { kind: "none" };
  return { kind: "count", count: metric.value, estimated: metric.estimated };
}
