"use client";

import type { RecapData } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/export";
import { useEffect, useId, useRef, useState } from "react";
import { button } from "@/components/ui";
import type { ShareCard } from "./end-screen";
import { announcement, type ExportJob, NOUN, percent } from "./export-state";
import { PRIVATE_NAMES_REMINDER, showReminder } from "./reminder";
import { SizePicker } from "./size-picker";
import { useExport } from "./use-export";

const FORMATS = ["9x16", "4x5", "1x1", "16x9"] as const satisfies readonly ExportFormat[];
const KEEP_OPEN: Record<ExportJob, string> = {
  mp4: "Keep this tab open while your video renders.",
  zip: "Keep this tab open while your slides render.",
  pdf: "Keep this tab open while your PDF renders.",
};

/**
 * The files of the story, made in this browser. `data` must already be a projection: the owner's
 * story (`storyData`, ADR-0017) or a visitor's (`publicWorld`). Everything here leaves the site, so
 * private names are in it only when the owner chose to show them. The dashboard's panel; the
 * story's own is the icon shelf at the closing stop (`ExportShelf`).
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
  const { state, support, busy, run: start, cancel } = useExport(data, { letter, onBusyChange });
  const [format, setFormat] = useState<ExportFormat>("9x16");
  const buttons = useRef<Partial<Record<ExportJob, HTMLButtonElement | null>>>({});
  const ids = useId();
  const reasonId = `${ids}-reason`;

  // A disabled button drops focus to the page; when the job ends, give it back to its button.
  const lastJob = state.status === "idle" ? null : state.job;
  useEffect(() => {
    if (busy || !lastJob) return;
    const active = document.activeElement;
    if (!active || active === document.body) buttons.current[lastJob]?.focus();
  }, [busy, lastJob]);

  const run = (job: ExportJob) => start(job, format);

  const checking = support === null;
  const mp4Off = checking || !support.mp4 || busy;
  const stillsOff = checking || !support.stills || busy;
  const reason = checking ? "Checking what this browser can make." : support.reason;
  const describe = (off: boolean) => (off && !busy && reason ? reasonId : undefined);

  // Compact: the dashboard keeps these in its sidebar, so the buttons drop to text size.
  const fileButton = `${button.secondary} w-full px-3 text-sm`;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* One size for the video, the slides and the PDF; the card keeps the link preview's. */}
      <SizePicker
        formats={FORMATS}
        value={format}
        onChange={setFormat}
        disabled={mp4Off && stillsOff}
      />

      {showReminder(privateNames) && <p className="font-semibold">{PRIVATE_NAMES_REMINDER}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button
          ref={(node) => {
            buttons.current.mp4 = node;
          }}
          type="button"
          disabled={mp4Off}
          aria-describedby={describe(mp4Off)}
          onClick={() => run("mp4")}
          className={fileButton}
        >
          Video
        </button>
        <button
          ref={(node) => {
            buttons.current.zip = node;
          }}
          type="button"
          disabled={stillsOff}
          aria-describedby={describe(stillsOff)}
          onClick={() => run("zip")}
          className={fileButton}
        >
          Slides
        </button>
        <button
          ref={(node) => {
            buttons.current.pdf = node;
          }}
          type="button"
          disabled={stillsOff}
          aria-describedby={describe(stillsOff)}
          onClick={() => run("pdf")}
          className={fileButton}
        >
          PDF
        </button>
        {"href" in card && !busy ? (
          <a href={card.href} download={card.filename ?? true} className={fileButton}>
            Share card
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-describedby={"reason" in card ? `${ids}-card` : undefined}
            className={fileButton}
          >
            Share card
          </button>
        )}
      </div>

      {!busy && reason && (
        <p id={reasonId} className="text-muted">
          {reason}
        </p>
      )}
      {"reason" in card && (
        <p id={`${ids}-card`} className="text-muted">
          {card.reason}
        </p>
      )}

      {state.status === "rendering" && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-line p-3">
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
            className="h-2 overflow-hidden rounded-full bg-overlay"
          >
            <div
              className="h-full bg-[#26a641] motion-safe:transition-[width] motion-safe:duration-200"
              style={{ width: `${percent(state)}%` }}
            />
          </div>
          <p className="text-muted">{KEEP_OPEN[state.job]}</p>
          <button type="button" onClick={cancel} className={fileButton}>
            Cancel
          </button>
        </div>
      )}

      {(state.status === "done" || state.status === "error" || state.status === "cancelled") && (
        // The live region below says the same to screen readers.
        <p aria-hidden="true" className="font-semibold">
          {announcement(state)}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement(state)}
      </p>
    </div>
  );
}
