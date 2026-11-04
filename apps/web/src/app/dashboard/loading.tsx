import { LoadingCell } from "@/components/loading-cell";

/** Shown the moment you open the dashboard, while the session and recap load. */
export default function Loading() {
  return <LoadingCell label="Opening your dashboard…" tone="ink" />;
}
