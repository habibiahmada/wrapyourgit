"use client";

import type { RecapData } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/export";
import { useEffect, useReducer, useRef, useState } from "react";
import { type ExportRunner, exportRunner } from "./export-runner";
import { type ExportJob, type ExportState, exportReducer, IDLE } from "./export-state";
import type { ExportSupport } from "./exports";

const NOTHING: ExportSupport = {
  mp4: false,
  stills: false,
  reason: "This browser can't make your files. Try a recent Chrome or Edge.",
};

export type ExportControls = {
  state: ExportState;
  /** Null while the renderer loads and checks what this browser can make. */
  support: ExportSupport | null;
  busy: boolean;
  run: (job: ExportJob, format: ExportFormat) => void;
  cancel: () => void;
};

/**
 * The files of the story, made in this browser: one runner for the caller's lifetime, the
 * renderer imported on mount so it never weighs on the first load. `data` must already be a
 * projection (the owner's `storyData`, ADR-0017, or a visitor's `publicWorld`): everything made
 * here leaves the site. While a render runs, a reload or tab close asks first.
 */
export function useExport(
  data: RecapData,
  { letter = true, onBusyChange }: { letter?: boolean; onBusyChange?: (busy: boolean) => void },
): ExportControls {
  const [state, dispatch] = useReducer(exportReducer, IDLE);
  const [support, setSupport] = useState<ExportSupport | null>(null);
  const runner = useRef<ExportRunner | null>(null);

  // The dashboard's refresh() re-sends `data` as a new object. Keyed on it, the runner would be
  // disposed mid-render and the panel left in "rendering" with a dead Cancel; so the runner lives
  // as long as the caller and reads the newest data when a run starts.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let live = true;
    import("./exports")
      .then((loaded) => {
        if (live) {
          runner.current = exportRunner(loaded, () => dataRef.current, dispatch, console.warn, {
            letter,
          });
        }
        return loaded.exportSupport();
      })
      .then((result) => live && setSupport(result))
      .catch(() => live && setSupport(NOTHING));
    return () => {
      live = false;
      // Leaving the screen ends the render; nothing should keep encoding in the background.
      runner.current?.dispose();
      runner.current = null;
    };
  }, [letter]);

  const busy = state.status === "rendering";
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  // Reload, tab close or a typed address would end the render without a word; the browser's own
  // "Leave site?" asks first. Not window.confirm: that blocks the thread the encoder runs on.
  useEffect(() => {
    if (!busy) return;
    const hold = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older Chrome and Safari still read returnValue instead of preventDefault().
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [busy]);

  return {
    state,
    support,
    busy,
    run: (job, format) => void runner.current?.run(job, format),
    cancel: () => runner.current?.cancel(),
  };
}
