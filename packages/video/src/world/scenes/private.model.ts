import { NOT_SHARED_PUBLICLY, type RecapData } from "@wyg/schema";

export type PrivateModel =
  | { kind: "count"; count: number; estimated: boolean }
  | { kind: "none" }
  | { kind: "unavailable" }
  /** A public recap: GitHub keeps the count from other viewers unless its owner shares it. */
  | { kind: "not-shared" };

/** Unavailable is its own state: a count GitHub would not give is never shown as zero. */
export function privateModel(data: RecapData): PrivateModel {
  const metric = data.contributions.privateCount;
  if (metric.status === "unavailable") {
    return metric.reason === NOT_SHARED_PUBLICLY ? { kind: "not-shared" } : { kind: "unavailable" };
  }
  if (metric.value === 0) return { kind: "none" };
  return { kind: "count", count: metric.value, estimated: metric.estimated };
}
