"use client";

import { type SyntheticEvent, useEffect, useId, useRef, useState } from "react";
import { button } from "@/components/ui";
import { cardFileName } from "./card-file";
import type { ExportJob, ExportState } from "./export-state";

/*
 * Look before you save (#201): the slides or the PDF, once made, and the share cards wait in a
 * modal preview with Download and Close. The dashboard's panel uses the site's dark tone; the
 * story's closing shelf its paper tone, like its own dialog.
 */

export type PreviewTone = "dark" | "paper";

const RING_PAPER =
  "focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_6px_var(--color-paper)]";

const TONES: Record<
  PreviewTone,
  { dialog: string; muted: string; primary: string; secondary: string; frame: string }
> = {
  dark: {
    dialog: "rounded-xl border border-line bg-surface text-fg backdrop:bg-black/80",
    muted: "text-muted",
    primary: button.primary,
    secondary: button.secondary,
    frame: "border border-line",
  },
  paper: {
    dialog: "on-light rounded-xl border border-ink/25 bg-paper text-ink backdrop:bg-ink/60",
    muted: "text-ink-soft",
    primary: `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-ink px-5 font-semibold text-paper hover:bg-ink/85 active:bg-ink/75 ${RING_PAPER}`,
    secondary: `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-ink/40 px-5 font-semibold text-ink hover:bg-ink/[0.07] active:bg-ink/[0.14] ${RING_PAPER}`,
    frame: "border border-ink/25",
  },
};

const DIALOG =
  "m-auto w-[min(44rem,calc(100vw-2rem))] max-h-[calc(100svh-2rem)] overscroll-contain p-0 backdrop:overflow-hidden backdrop:overscroll-contain";

/** Opens as a modal on mount, closes on unmount; Escape runs `onClose`. */
function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (node && !node.open) node.showModal();
    return () => node?.close();
  }, []);
  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };
  return { ref, onCancel };
}

const KIND: Record<ExportJob, { title: string; noun: string; save: string }> = {
  mp4: { title: "Your video", noun: "frame", save: "Download MP4" },
  zip: { title: "Your slides", noun: "slide", save: "Download ZIP" },
  pdf: { title: "Your PDF", noun: "page", save: "Download PDF" },
};

/**
 * The slides or the PDF, made and waiting: every slide in a row to scroll through, then Download
 * or Close. Close drops the file (the runner frees its pages).
 */
export function FilePreview({
  state,
  tone,
  onSave,
  onClose,
}: {
  state: Extract<ExportState, { status: "ready" }>;
  tone: PreviewTone;
  onSave: () => void;
  onClose: () => void;
}) {
  const { ref, onCancel } = useModal(onClose);
  const titleId = useId();
  const t = TONES[tone];
  const kind = KIND[state.job];
  const count = state.pages.length;

  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={onCancel} className={`${DIALOG} ${t.dialog}`}>
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {kind.title}
          </h2>
          <p className={`text-sm ${t.muted}`}>
            {count} {count === 1 ? kind.noun : `${kind.noun}s`} · {state.file}
          </p>
        </div>
        {/* Scrolls sideways: reachable by keyboard, so it can be read without a mouse. */}
        <ul
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the row scrolls, so it must be reachable by keyboard
          tabIndex={0}
          aria-label={`${count} ${kind.noun}s, scroll sideways`}
          className="flex snap-x gap-3 overflow-x-auto pb-2"
        >
          {state.pages.map((src, i) => (
            <li key={src} className="shrink-0 snap-start">
              {/* biome-ignore lint/performance/noImgElement: a slide made in this browser, shown from its object URL */}
              <img
                src={src}
                alt={`${kind.noun[0]?.toUpperCase()}${kind.noun.slice(1)} ${i + 1} of ${count}`}
                className={`h-[min(50svh,22rem)] w-auto rounded-md ${t.frame}`}
              />
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={t.secondary}>
            Close
          </button>
          <button type="button" onClick={onSave} className={t.primary}>
            {kind.save}
          </button>
        </div>
      </div>
    </dialog>
  );
}

type CardLoad =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; url: string; file: string };

/**
 * A share card: fetched once, shown, and saved from that same file, so the preview is exactly
 * what downloads and the server draws it once. Loading and failure have their own lines.
 */
export function CardPreview({
  href,
  title,
  fallbackName,
  tone,
  onClose,
}: {
  href: string;
  title: string;
  /** The name to save under when the server sends none. */
  fallbackName: string;
  tone: PreviewTone;
  onClose: () => void;
}) {
  const { ref, onCancel } = useModal(onClose);
  const titleId = useId();
  const t = TONES[tone];
  const [load, setLoad] = useState<CardLoad>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    let made: string | null = null;
    setLoad({ status: "loading" });
    fetch(href, { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`card ${response.status}`);
        const blob = await response.blob();
        if (!live) return;
        made = URL.createObjectURL(blob);
        setLoad({
          status: "ready",
          url: made,
          file: cardFileName(response.headers.get("content-disposition"), fallbackName),
        });
      })
      .catch(() => live && setLoad({ status: "error" }));
    return () => {
      live = false;
      // Not at once: a Download pressed just before the dialog closed may still be reading it
      // (the same delay as exports.ts download()).
      const url = made;
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 40_000);
    };
    // `attempt` re-runs the fetch for Try again.
  }, [href, fallbackName, attempt]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={onCancel} className={`${DIALOG} ${t.dialog}`}>
      <div className="grid gap-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div className={`grid aspect-[1200/630] w-full place-items-center overflow-hidden rounded-md ${t.frame}`}>
          {load.status === "loading" && (
            <p role="status" className={`text-sm ${t.muted}`}>
              Drawing your card…
            </p>
          )}
          {load.status === "error" && (
            <div role="alert" className="grid justify-items-center gap-3 p-4 text-center text-sm">
              <p>The card didn&apos;t load. Check your connection and try again.</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className={t.secondary}>
                Try again
              </button>
            </div>
          )}
          {load.status === "ready" && (
            // biome-ignore lint/performance/noImgElement: the card as fetched, shown from its object URL
            <img
              src={load.url}
              width={1200}
              height={630}
              alt={`${title}, as it will download`}
              className="h-auto w-full"
            />
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={t.secondary}>
            Close
          </button>
          {load.status === "ready" ? (
            <a href={load.url} download={load.file} onClick={() => window.setTimeout(onClose, 0)} className={t.primary}>
              Download card
            </a>
          ) : (
            <button type="button" disabled className={`${t.primary} disabled:cursor-not-allowed disabled:opacity-60`}>
              Download card
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
