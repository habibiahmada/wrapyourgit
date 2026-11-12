"use client";

import { type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/export";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Art } from "@/components/art";
import type { EndLink, ShareCard } from "./end-screen";
import { announcement, type ExportJob, NOUN, percent } from "./export-state";
import { PRIVATE_NAMES_REMINDER, showReminder } from "./reminder";
import { useExport } from "./use-export";

const FORMATS = ["9x16", "4x5", "1x1", "16x9"] as const satisfies readonly ExportFormat[];
/** Cell's poses, one after another while a file is made: the one picture that changes. */
const POSES = ["cutout-cell-think", "cutout-cell-wave", "cutout-cell-cheer", "cutout-cell-proud"];
const POSE_MS = 1800;
const NOTE_MS = 5000;
/** The rings sit on the city, which can be any colour: an ink line between two paper bands. */
const RING =
  "focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_6px_var(--color-paper)]";
/** Paper squares like the Sound control, so the story's web controls read as one set. */
const ICON = `grid size-11 cursor-pointer place-items-center rounded-md border border-ink/25 bg-paper/90 text-ink hover:bg-paper active:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-paper/90 aria-expanded:bg-paper aria-expanded:border-ink ${RING}`;

const ratio = (format: ExportFormat) => format.replace("x", ":");

/**
 * "Keep your year" at the closing stop: the story's files as a few icons on the grass beside the
 * train, no panel and no words on screen (every icon is named for assistive tech and on hover).
 * Video opens a row of its four shapes. While a file is made, and only then, a small dialog shows
 * Cell, a bar and one sentence. Never part of the composition, so never in a file.
 */
export function ExportShelf({
  data,
  privateNames,
  card,
  letter,
  links,
  onBusyChange,
}: {
  /** A projection already (`storyData` or `publicWorld`): everything here leaves the site. */
  data: RecapData;
  /** True when `data` names a private repository: the dialog then says the files do too. */
  privateNames: boolean;
  card: ShareCard;
  letter: boolean;
  /** Where to go next (`endScreenFor`), after the files. */
  links: readonly EndLink[];
  onBusyChange: (busy: boolean) => void;
}) {
  const { state, support, busy, run, cancel } = useExport(data, { letter, onBusyChange });
  const [shapes, setShapes] = useState(false);
  const videoButton = useRef<HTMLButtonElement>(null);
  const shapesRow = useRef<HTMLFieldSetElement>(null);
  const started = useRef<HTMLElement | null>(null);
  const ids = useId();
  const reasonId = `${ids}-reason`;
  const cardId = `${ids}-card`;

  const checking = support === null;
  const mp4Off = checking || !support.mp4;
  const stillsOff = checking || !support.stills;
  const reason = checking ? "Checking what this browser can make." : support.reason;
  const describe = (off: boolean) => (off && reason ? reasonId : undefined);

  const start = (job: ExportJob, format: ExportFormat, from: HTMLElement | null) => {
    started.current = from;
    setShapes(false);
    run(job, format);
  };

  // The row of shapes closes on Escape (focus back on Video) and on a press anywhere else.
  useEffect(() => {
    if (!shapes) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setShapes(false);
      videoButton.current?.focus();
    };
    const onPress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (videoButton.current?.contains(target) || shapesRow.current?.contains(target)) return;
      setShapes(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPress, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPress, true);
    };
  }, [shapes]);

  // The dialog took focus; when it closes, give it back to the icon that started the file.
  useEffect(() => {
    if (busy) return;
    const back = started.current;
    if (back?.isConnected) back.focus();
    else if (back) videoButton.current?.focus();
  }, [busy]);

  const said = announcement(state);
  // What happened, on screen for a few seconds; the live region says it to screen readers.
  const [note, setNote] = useState(false);
  const ended = state.status === "done" || state.status === "error" || state.status === "cancelled";
  useEffect(() => {
    if (!ended) return;
    setNote(true);
    const timer = window.setTimeout(() => setNote(false), NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [ended]);

  return (
    <div className="relative">
      <div className="relative">
        {shapes && (
          <fieldset
            ref={shapesRow}
            className="absolute right-0 bottom-full m-0 mb-2 flex gap-2 border-0 p-0"
          >
            <legend className="sr-only">Video shape</legend>
            {FORMATS.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={`Video ${ratio(key)}, ${VIDEO_FORMATS[key].label}`}
                title={`Video ${ratio(key)}`}
                onClick={(event) => start("mp4", key, videoButton.current ?? event.currentTarget)}
                className={ICON}
              >
                <ShapeIcon format={key} />
              </button>
            ))}
          </fieldset>
        )}
        <ul aria-label="Keep your year" className="flex flex-wrap justify-end gap-2">
          <li>
            <button
              ref={videoButton}
              type="button"
              aria-label="Video (MP4)"
              title="Video (MP4)"
              aria-expanded={shapes}
              disabled={mp4Off}
              aria-describedby={describe(mp4Off)}
              onClick={() => setShapes((open) => !open)}
              className={ICON}
            >
              <Glyph>
                <rect x="2.5" y="4.5" width="15" height="11" />
                <path d="M8.5 7.5v5l4-2.5z" fill="currentColor" stroke="none" />
              </Glyph>
            </button>
          </li>
          <li>
            <button
              type="button"
              aria-label="Slides (PNG, ZIP)"
              title="Slides (PNG, ZIP)"
              disabled={stillsOff}
              aria-describedby={describe(stillsOff)}
              onClick={(event) => start("zip", "9x16", event.currentTarget)}
              className={ICON}
            >
              <Glyph>
                <rect x="5.5" y="2.5" width="12" height="10" />
                <path d="M2.5 6.5v11h12" />
              </Glyph>
            </button>
          </li>
          <li>
            <button
              type="button"
              aria-label="PDF"
              title="PDF"
              disabled={stillsOff}
              aria-describedby={describe(stillsOff)}
              onClick={(event) => start("pdf", "9x16", event.currentTarget)}
              className={ICON}
            >
              <Glyph>
                <path d="M4.5 2.5h7l4 4v11h-11z" />
                <path d="M11.5 2.5v4h4M7.5 10.5h5M7.5 13.5h5" />
              </Glyph>
            </button>
          </li>
          <li>
            {"href" in card ? (
              <a
                href={card.href}
                download={card.filename ?? true}
                aria-label="Share card (PNG)"
                title="Share card (PNG)"
                className={ICON}
              >
                <CardGlyph />
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-label="Share card (PNG)"
                title={card.reason}
                aria-describedby={cardId}
                className={ICON}
              >
                <CardGlyph />
              </button>
            )}
          </li>
          {links.map((link) => (
            <li key={link.href}>
              {link.route ? (
                <a href={link.href} aria-label={link.label} title={link.label} className={ICON}>
                  <LinkGlyph href={link.href} />
                </a>
              ) : (
                <Link href={link.href} aria-label={link.label} title={link.label} className={ICON}>
                  <LinkGlyph href={link.href} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {note && (
        // Floats under the icons, so they stay where they were.
        <p
          aria-hidden="true"
          className="absolute top-full right-0 mt-2 w-max max-w-[min(16rem,calc(100vw-1.5rem))] rounded-md bg-paper/95 px-2 py-1 text-sm font-semibold text-ink"
        >
          {said}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
      {reason && (
        <p id={reasonId} className="sr-only">
          {reason}
        </p>
      )}
      {"reason" in card && (
        <p id={cardId} className="sr-only">
          {card.reason}
        </p>
      )}

      {state.status === "rendering" && (
        <Downloading
          noun={NOUN[state.job]}
          value={percent(state)}
          reminder={showReminder(privateNames)}
          onCancel={cancel}
        />
      )}
    </div>
  );
}

/**
 * The only screen over the story: modal, so nothing else can be pressed while the file is made
 * (leaving would throw it away). Escape cancels, like the button.
 */
function Downloading({
  noun,
  value,
  reminder,
  onCancel,
}: {
  noun: string;
  value: number;
  reminder: boolean;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pose, setPose] = useState(0);
  const titleId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    return () => node?.close();
  }, []);

  // Under reduced motion Cell keeps one pose, and the art itself is a still.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setPose((n) => (n + 1) % POSES.length), POSE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="on-light m-auto w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-ink/25 bg-paper p-5 text-ink backdrop:bg-ink/60"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative aspect-[4/3] w-48">
          {POSES.map((id, i) => (
            <div
              key={id}
              className={`absolute inset-0 motion-safe:transition-opacity motion-safe:duration-300 ${
                i === pose ? "opacity-100" : "opacity-0"
              }`}
            >
              <Art
                id={id}
                alt=""
                priority={i === 0}
                width={720}
                height={540}
                className="h-auto w-full"
              />
            </div>
          ))}
        </div>
        <p id={titleId} className="text-lg font-semibold">
          Downloading your {noun}…
        </p>
        <div
          role="progressbar"
          aria-labelledby={titleId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          className="h-3 w-full overflow-hidden rounded-full border border-ink"
        >
          <div
            className="h-full bg-ink motion-safe:transition-[width] motion-safe:duration-200"
            style={{ width: `${value}%` }}
          />
        </div>
        {reminder && <p className="text-sm text-ink-soft">{PRIVATE_NAMES_REMINDER}</p>}
        <button
          type="button"
          onClick={onCancel}
          className={`min-h-11 cursor-pointer rounded-md px-4 text-base font-semibold underline underline-offset-4 hover:bg-ink/[0.07] active:bg-ink/[0.14] ${RING}`}
        >
          Cancel
        </button>
      </div>
    </dialog>
  );
}

/** Square caps and mitred corners: blocky like the city, not a library's rounded strokes. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      {children}
    </svg>
  );
}

/** A video's shape drawn as itself: the frame at its ratio, with a play mark. */
function ShapeIcon({ format }: { format: ExportFormat }) {
  const { width, height } = VIDEO_FORMATS[format];
  const scale = 15 / Math.max(width, height);
  const w = width * scale;
  const h = height * scale;
  return (
    <Glyph>
      <rect x={10 - w / 2} y={10 - h / 2} width={w} height={h} />
      <path d="M8.75 8v4l3.25-2z" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

function CardGlyph() {
  return (
    <Glyph>
      <rect x="2.5" y="4.5" width="15" height="11" />
      <rect x="5" y="7.5" width="4" height="4" fill="currentColor" stroke="none" />
      <path d="M11.5 8.5h3.5M11.5 11.5h2" />
    </Glyph>
  );
}

/** The way on: the dashboard's grid, a new recap's plus, or signing in. */
function LinkGlyph({ href }: { href: string }) {
  if (href === "/dashboard") {
    return (
      <Glyph>
        <rect x="3.5" y="3.5" width="5" height="5" />
        <rect x="11.5" y="3.5" width="5" height="5" />
        <rect x="3.5" y="11.5" width="5" height="5" />
        <rect x="11.5" y="11.5" width="5" height="5" />
      </Glyph>
    );
  }
  if (href === "/") {
    return (
      <Glyph>
        <rect x="3.5" y="3.5" width="13" height="13" />
        <path d="M10 7v6M7 10h6" />
      </Glyph>
    );
  }
  return (
    <Glyph>
      <path d="M11.5 3.5h5v13h-5" />
      <path d="M3 10h9M9 6.5l3.5 3.5L9 13.5" />
    </Glyph>
  );
}
