import type { RecapData } from "@wyg/schema";
import { type ExportFormat, exportFileName } from "@wyg/video/world";
import type { ExportAction, ExportJob } from "./export-state";

/** The parts of `./exports` a run uses; a type only, so importing this never loads the renderer. */
export type ExportEngineModule = Pick<
  typeof import("./exports"),
  "renderMp4" | "renderSlides" | "zipSlides" | "pdfSlides" | "download"
>;

export type ExportRunner = {
  run: (job: ExportJob, format: ExportFormat) => Promise<void>;
  /** The reader's Cancel: aborts and reports `cancel` at once. */
  cancel: () => void;
  /** The screen went away: aborts without reporting. */
  dispose: () => void;
  busy: () => boolean;
};

/** Slides fill this much of the bar; ZIP or PDF assembly, which reports nothing, the rest. */
const SLIDES_SHARE = 0.9;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/**
 * One export at a time, owned by its AbortController. The guard reads the controller, not React
 * state, so a second run can't slip in before a re-render; and only the newest run may report,
 * since a cancelled render can still settle after a new one has started.
 *
 * `data` is read when a run starts, not when the runner is made: the panel builds one runner for
 * its lifetime, so a server refresh that re-sends the recap neither aborts a render nor strands it.
 */
export function exportRunner(
  engine: ExportEngineModule,
  getData: () => RecapData,
  dispatch: (action: ExportAction) => void,
  warn: (...args: unknown[]) => void = console.warn,
): ExportRunner {
  let current: AbortController | null = null;

  const abort = () => {
    current?.abort();
    current = null;
  };

  const run = async (job: ExportJob, format: ExportFormat) => {
    if (current) return;
    const controller = new AbortController();
    current = controller;
    const mine = () => current === controller;
    const signal = controller.signal;
    const data = getData();
    dispatch({ type: "start", job });
    try {
      let blob: Blob;
      let file: string;
      if (job === "mp4") {
        blob = await engine.renderMp4(data, format, {
          signal,
          onProgress: (value) => mine() && dispatch({ type: "progress", value }),
        });
        file = exportFileName("mp4", data, { format });
      } else {
        const slides = await engine.renderSlides(data, {
          signal,
          onProgress: (done, total) =>
            mine() &&
            dispatch({ type: "progress", value: total > 0 ? (done / total) * SLIDES_SHARE : 0 }),
        });
        blob =
          job === "zip"
            ? await engine.zipSlides(slides)
            : await engine.pdfSlides(slides, {
                title: `WrapYourGit ${data.meta.year}: @${data.profile.login}`,
              });
        if (mine()) dispatch({ type: "progress", value: 1 });
        file = exportFileName(job, data);
      }
      if (!mine() || signal.aborted) return;
      engine.download(blob, file);
      dispatch({ type: "finish", file });
    } catch (error) {
      if (!mine()) return;
      if (isAbort(error)) dispatch({ type: "cancel" });
      else {
        // A warning, not an error: the reader already sees what happened and what to try.
        warn("Export failed", error);
        dispatch({ type: "fail" });
      }
    } finally {
      if (mine()) current = null;
    }
  };

  return {
    run,
    cancel: () => {
      if (!current) return;
      abort();
      dispatch({ type: "cancel" });
    },
    dispose: abort,
    busy: () => current !== null,
  };
}
