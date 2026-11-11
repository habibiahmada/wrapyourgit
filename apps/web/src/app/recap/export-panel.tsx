"use client";

import { type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/world";
import { useEffect, useId, useReducer, useRef, useState } from "react";
import type { ShareCard } from "./end-screen";
import { type ExportRunner, exportRunner } from "./export-runner";
import { announcement, type ExportJob, exportReducer, IDLE, NOUN, percent } from "./export-state";
import type { ExportSupport } from "./exports";
import { PAPER_BUTTON } from "./paper-button";
import { PRIVATE_NAMES_REMINDER, showReminder } from "./reminder";

const FORMATS = ["9x16", "4x5", "1x1", "16x9"] as const satisfies readonly ExportFormat[];
const NOTHING: ExportSupport = {
  mp4: false,
  stills: false,
  reason: "This browser can't make your files. Try a recent Chrome or Edge.",
};
const KEEP_OPEN: Record<ExportJob, string> = {
  mp4: "Keep this tab open while your video renders.",
  zip: "Keep this tab open while your slides render.",
  pdf: "Keep this tab open while your PDF renders.",
};

const ratio = (format: ExportFormat) => format.replace("x", ":");

/**
 * The files of the story, made in this browser. `data` must already be a projection: the owner's
 * story (`storyData`, ADR-0017) or a visitor's (`publicWorld`). Everything here leaves the site, so
 * private names are in it only when the owner chose to show them. The renderer is imported on mount, so it never weighs
 * on the player's first load.
 */
export function ExportPanel({
  data,
  privateNames,
  card,
  letter = true,
  onBusyChange,
}: {
  data: RecapData;
  /** True when `data` names a private repository: a reminder line then sits above the buttons. */
  privateNames: boolean;
  /** Where the share card downloads from (`shareCardFor`), or why there is none. */
  card: ShareCard;
  /** False leaves the letter's pages out of every file, as a visitor's story does. */
  letter?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [state, dispatch] = useReducer(exportReducer, IDLE);
  const [support, setSupport] = useState<ExportSupport | null>(null);
  const [format, setFormat] = useState<ExportFormat>("9x16");
  const runner = useRef<ExportRunner | null>(null);
  const buttons = useRef<Partial<Record<ExportJob, HTMLButtonElement | null>>>({});
  const ids = useId();
  const reasonId = `${ids}-reason`;

  // The dashboard's refresh() re-sends `data` as a new object. Keyed on it, the runner would be
  // disposed mid-render and the panel left in "rendering" with a dead Cancel; so the runner lives
  // as long as the panel and reads the newest data when a run starts.
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
  // Client navigations never fire it: the story world turns its own exits off while busy (via
  // onBusyChange); the dashboard's site links are not covered yet.
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

  // A disabled button drops focus to the page; when the job ends, give it back to its button.
  const lastJob = state.status === "idle" ? null : state.job;
  useEffect(() => {
    if (busy || !lastJob) return;
    const active = document.activeElement;
    if (!active || active === document.body) buttons.current[lastJob]?.focus();
  }, [busy, lastJob]);

  const run = (job: ExportJob) => runner.current?.run(job, format);
  const cancel = () => runner.current?.cancel();

  const checking = support === null;
  const mp4Off = checking || !support.mp4 || busy;
  const stillsOff = checking || !support.stills || busy;
  const reason = checking ? "Checking what this browser can make." : support.reason;
  const describe = (off: boolean) => (off && !busy && reason ? reasonId : undefined);

  return (
    <div className="flex flex-col gap-6">
      <fieldset disabled={mp4Off} className="flex flex-col gap-3">
        <legend className="mb-3 text-base font-semibold">Video format</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMATS.map((key) => (
            <label
              key={key}
              className={`flex min-h-11 flex-col justify-center gap-0.5 rounded-[var(--radius-control)] border px-3 py-2 ${
                format === key ? "border-ink bg-ink/[0.07]" : "border-ink/60"
              } ${mp4Off ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-ink/[0.05]"}`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name={`${ids}-format`}
                  value={key}
                  checked={format === key}
                  onChange={() => setFormat(key)}
                  className="size-4 accent-ink"
                />
                {ratio(key)}
              </span>
              <span className="text-sm text-ink-soft">{VIDEO_FORMATS[key].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {showReminder(privateNames) && (
        <p className="text-base font-semibold">{PRIVATE_NAMES_REMINDER}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          ref={(node) => {
            buttons.current.mp4 = node;
          }}
          type="button"
          disabled={mp4Off}
          aria-describedby={describe(mp4Off)}
          onClick={() => run("mp4")}
          className={PAPER_BUTTON.primary}
        >
          Video (MP4)
        </button>
        <button
          ref={(node) => {
            buttons.current.zip = node;
          }}
          type="button"
          disabled={stillsOff}
          aria-describedby={describe(stillsOff)}
          onClick={() => run("zip")}
          className={PAPER_BUTTON.secondary}
        >
          Slides (PNG, ZIP)
        </button>
        <button
          ref={(node) => {
            buttons.current.pdf = node;
          }}
          type="button"
          disabled={stillsOff}
          aria-describedby={describe(stillsOff)}
          onClick={() => run("pdf")}
          className={PAPER_BUTTON.secondary}
        >
          PDF
        </button>
        {"href" in card && !busy ? (
          <a href={card.href} download={card.filename ?? true} className={PAPER_BUTTON.secondary}>
            Share card (PNG)
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-describedby={"reason" in card ? `${ids}-card` : undefined}
            className={PAPER_BUTTON.secondary}
          >
            Share card (PNG)
          </button>
        )}
      </div>

      {!busy && reason && (
        <p id={reasonId} className="text-base text-ink-soft">
          {reason}
        </p>
      )}
      {"reason" in card && (
        <p id={`${ids}-card`} className="text-base text-ink-soft">
          {card.reason}
        </p>
      )}

      {state.status === "rendering" && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-ink/40 p-4">
          <div className="flex items-baseline justify-between gap-4 font-semibold">
            <span>Making your {NOUN[state.job]}</span>
            <span className="tabular-nums">{percent(state)}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Making your ${NOUN[state.job]}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent(state)}
            className="h-3 overflow-hidden rounded-full border border-ink"
          >
            <div
              className="h-full bg-ink motion-safe:transition-[width] motion-safe:duration-200"
              style={{ width: `${percent(state)}%` }}
            />
          </div>
          <p className="text-base">{KEEP_OPEN[state.job]}</p>
          <button type="button" onClick={cancel} className={PAPER_BUTTON.secondary}>
            Cancel
          </button>
        </div>
      )}

      {(state.status === "done" || state.status === "error" || state.status === "cancelled") && (
        // The live region below says the same to screen readers.
        <p aria-hidden="true" className="text-base font-semibold">
          {announcement(state)}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement(state)}
      </p>
    </div>
  );
}
