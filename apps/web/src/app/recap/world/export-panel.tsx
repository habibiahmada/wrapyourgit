"use client";

import { type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import { type ExportFormat, exportFileName } from "@wyg/video/world";
import { useEffect, useId, useReducer, useRef, useState } from "react";
import { announcement, type ExportJob, exportReducer, IDLE, percent } from "./export-state";
import type { ExportSupport } from "./exports";

type ExportsModule = typeof import("./exports");

const FORMATS = ["9x16", "4x5", "1x1", "16x9"] as const satisfies readonly ExportFormat[];
const NOTHING: ExportSupport = {
  mp4: false,
  stills: false,
  reason: "This browser can't make your files. Try a recent Chrome or Edge.",
};
const NOUN: Record<ExportJob, string> = { mp4: "video", zip: "slides", pdf: "PDF" };
const KEEP_OPEN: Record<ExportJob, string> = {
  mp4: "Keep this tab open while your video renders.",
  zip: "Keep this tab open while your slides render.",
  pdf: "Keep this tab open while your PDF renders.",
};

/*
 * Ink on paper, like the letter: the panel sits on the city, not on the site's dark canvas, so
 * ui.ts's GitHub buttons would be a second visual language here. Hover and active tint the fill;
 * disabled fades and drops the tint (`enabled:`), and the base layer sets the not-allowed cursor.
 */
const BASE =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-ink px-5 text-base font-semibold motion-safe:transition-colors disabled:opacity-50 sm:w-auto";
export const PAPER_BUTTON = {
  primary: `${BASE} bg-ink text-paper enabled:hover:bg-ink/85 enabled:active:bg-ink/70`,
  secondary: `${BASE} bg-transparent text-ink enabled:hover:bg-ink/[0.07] enabled:active:bg-ink/[0.14]`,
} as const;

const ratio = (format: ExportFormat) => format.replace("x", ":");
const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/**
 * The files of the story, made in this browser. `data` must already be the public projection
 * (AGENTS.md rule 6): everything here leaves the site. The renderer is imported on mount, so it
 * never weighs on the player's first load.
 */
export function ExportPanel({
  data,
  card,
  onBusyChange,
}: {
  data: RecapData;
  /** Whether `/api/card` can answer: it needs a signed-in user with a recap. */
  card: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [state, dispatch] = useReducer(exportReducer, IDLE);
  const [support, setSupport] = useState<ExportSupport | null>(null);
  const [format, setFormat] = useState<ExportFormat>("9x16");
  const renderer = useRef<ExportsModule | null>(null);
  const current = useRef<AbortController | null>(null);
  const buttons = useRef<Partial<Record<ExportJob, HTMLButtonElement | null>>>({});
  const ids = useId();
  const reasonId = `${ids}-reason`;

  useEffect(() => {
    let live = true;
    import("./exports")
      .then((loaded) => {
        renderer.current = loaded;
        return loaded.exportSupport();
      })
      .then((result) => live && setSupport(result))
      .catch(() => live && setSupport(NOTHING));
    return () => {
      live = false;
      // Leaving the screen ends the render; nothing should keep encoding in the background.
      current.current?.abort();
      current.current = null;
    };
  }, []);

  const busy = state.status === "rendering";
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  // A disabled button drops focus to the page; when the job ends, give it back to its button.
  const lastJob = state.status === "idle" ? null : state.job;
  useEffect(() => {
    if (busy || !lastJob) return;
    const active = document.activeElement;
    if (!active || active === document.body) buttons.current[lastJob]?.focus();
  }, [busy, lastJob]);

  const run = async (job: ExportJob) => {
    const exports = renderer.current;
    if (!exports || busy) return;
    const controller = new AbortController();
    current.current = controller;
    // Only the newest job may report: a cancelled one can still settle afterwards.
    const mine = () => current.current === controller;
    const signal = controller.signal;
    dispatch({ type: "start", job });
    try {
      let blob: Blob;
      let file: string;
      if (job === "mp4") {
        blob = await exports.renderMp4(data, format, {
          signal,
          onProgress: (value) => mine() && dispatch({ type: "progress", value }),
        });
        file = exportFileName("mp4", data, { format });
      } else {
        const slides = await exports.renderSlides(data, {
          signal,
          onProgress: (done, total) =>
            mine() && dispatch({ type: "progress", value: total > 0 ? done / total : 0 }),
        });
        blob =
          job === "zip"
            ? await exports.zipSlides(slides)
            : await exports.pdfSlides(slides, {
                title: `WrapYourGit ${data.meta.year}: @${data.profile.login}`,
              });
        file = exportFileName(job, data);
      }
      if (!mine() || signal.aborted) return;
      exports.download(blob, file);
      dispatch({ type: "finish", file });
    } catch (error) {
      if (!mine()) return;
      if (isAbort(error)) dispatch({ type: "cancel" });
      else {
        // A warning, not an error: the reader already sees what happened and what to try.
        console.warn("Export failed", error);
        dispatch({ type: "fail" });
      }
    } finally {
      if (mine()) current.current = null;
    }
  };

  const cancel = () => {
    current.current?.abort();
    current.current = null;
    dispatch({ type: "cancel" });
  };

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
                format === key ? "border-ink bg-ink/[0.07]" : "border-ink/40"
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
        {card && !busy ? (
          <a href="/api/card" download className={PAPER_BUTTON.secondary}>
            Share card (PNG)
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-describedby={card ? undefined : `${ids}-card`}
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
      {!card && (
        <p id={`${ids}-card`} className="text-base text-ink-soft">
          The share card is made from your saved recap. Sign in and build it to get one.
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
