import { LoadingCell } from "@/components/loading-cell";

/** Shown while the story's data loads, before the first chapter. */
export default function Loading() {
  return <LoadingCell label="Setting up your story…" tone="ink" />;
}
