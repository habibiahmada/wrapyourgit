import { useEffect, useRef, useState } from "react";
import { type ExportState, timeLeft } from "./export-state";

/**
 * The estimate of the time a render still needs, refreshed with each step of progress. The clock
 * starts when the render does; the reducer stays free of time, so its tests need no clock.
 */
export function useTimeLeft(state: ExportState): string | null {
  const rendering = state.status === "rendering";
  const progress = rendering ? state.progress : 0;
  const started = useRef(0);
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!rendering) {
      started.current = 0;
      setLabel(null);
      return;
    }
    if (started.current === 0) started.current = performance.now();
    setLabel(timeLeft(progress, performance.now() - started.current));
  }, [rendering, progress]);
  return label;
}
