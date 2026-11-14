"use client";

import { type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/export";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Art } from "@/components/art";
import type { EndLink, ShareCard } from "./end-screen";
import { announcement, type ExportJob, percent, renderingTitle } from "./export-state";
import { PRIVATE_NAMES_REMINDER, showReminder } from "./reminder";
import { useExport } from "./use-export";
import { useTimeLeft } from "./use-time-left";

const FORMATS = ["9x16", "4x5", "1x1", "16x9"] as const satisfies readonly ExportFormat[];
/** Cell's poses, one after another while a file is made: the one picture that changes. */
const POSES = ["cutout-cell-think", "cutout-cell-wave", "cutout-cell-cheer", "cutout-cell-proud"];
const POSE_MS = 1800;
const NOTE_MS = 5000;
/** The rings sit on the city, which can be any colour: an ink line between two paper bands. */
const RING =
  "focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_6px_var(--color-paper)]";
/**
 * A paper ticket: an ink tile with the file's pixel mark, then its name. Paper like the Sound
 * control, so the story's web controls read as one set; the ink tile repeats the closing sky.
 */
const TICKET = `flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md border border-ink/25 bg-paper/95 py-1.5 pr-3 pl-1.5 text-left text-sm font-semibold text-ink hover:bg-paper hover:border-ink/60 active:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink/25 aria-expanded:border-ink ${RING}`;
const TILE = "grid size-8 shrink-0 place-items-center rounded bg-ink text-paper";

const ratio = (format: ExportFormat) => format.replace("x", ":");
/** The files made here, each in the shape chosen from its ticket. */
const JOBS: readonly ExportJob[] = ["mp4", "zip", "pdf"];
const NAME: Record<ExportJob, string> = { mp4: "Video", zip: "Slides", pdf: "PDF" };
const TYPE: Record<ExportJob, string> = { mp4: "MP4", zip: "ZIP", pdf: "" };
const MARK: Record<ExportJob, ReactNode> = {
  mp4: <VideoMark />,
  zip: <SlidesMark />,
  pdf: <PdfMark />,
};
/** Each shape's short use, so the choice reads without the full label. */
const USE: Record<ExportFormat, string> = {
  "9x16": "Reels, TikTok",
  "4x5": "Instagram feed",
  "1x1": "Square post",
  "16x9": "YouTube",
};

/**
 * "Keep your year" at the closing stop: the story's files as two columns of paper tickets on the
 * grass at the bottom right, each an ink tile with a pixel mark and the file's name. The video,
 * slides and PDF open their four shapes first; the share card is the link preview's own size. While a file is made, and only then, a small dialog shows Cell, a bar and one
 * sentence. Never part of the composition, so never in a file.
 */
export function ExportShelf({
  data,
  title,
  privateNames,
  card,
  letter,
  links,
  onBusyChange,
}: {
  /** A projection already (`storyData` or `publicWorld`): everything here leaves the site. */
  data: RecapData;
  /** "Keep your year", or a visitor's "Keep @login's year": the column's heading. */
  title: string;
  /** True when `data` names a private repository: the dialog then says the files do too. */
  privateNames: boolean;
  card: ShareCard;
  letter: boolean;
  /** Where to go next (`endScreenFor`), after the files. */
  links: readonly EndLink[];
  onBusyChange: (busy: boolean) => void;
}) {
  const { state, support, busy, run, cancel } = useExport(data, { letter, onBusyChange });
  const left = useTimeLeft(state);
  // Which file's shapes are open, if any; and each file's ticket, to take focus back.
  const [open, setOpen] = useState<ExportJob | null>(null);
  const tickets = useRef<Partial<Record<ExportJob, HTMLButtonElement | null>>>({});
  const shapesList = useRef<HTMLFieldSetElement>(null);
  const started = useRef<HTMLElement | null>(null);
  const ids = useId();
  const reasonId = `${ids}-reason`;
  const cardId = `${ids}-card`;
  const headingId = `${ids}-heading`;

  const checking = support === null;
  const mp4Off = checking || !support.mp4;
  const stillsOff = checking || !support.stills;
  const reason = checking ? "Checking what this browser can make." : support.reason;
  const describe = (off: boolean) => (off && reason ? reasonId : undefined);

  const start = (job: ExportJob, format: ExportFormat, from: HTMLElement | null) => {
    started.current = from;
    setOpen(null);
    run(job, format);
  };

  // The shapes close on Escape (focus back on their ticket) and on a press anywhere else.
  useEffect(() => {
    if (!open) return;
    const ticket = tickets.current[open];
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(null);
      ticket?.focus();
    };
    const onPress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ticket?.contains(target) || shapesList.current?.contains(target)) return;
      setOpen(null);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPress, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPress, true);
    };
  }, [open]);

  // The dialog took focus; when it closes, give it back to the ticket that started the file.
  useEffect(() => {
    if (busy) return;
    const back = started.current;
    if (back?.isConnected) back.focus();
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
    <section aria-labelledby={headingId} className="relative w-[min(22rem,calc(100cqw-1.5rem))]">
      <h2
        id={headingId}
        className="mb-1.5 ml-auto w-fit rounded bg-ink/80 px-2 py-0.5 text-sm font-bold text-paper [overflow-wrap:anywhere]"
      >
        {title}
      </h2>
      {open && (
        // Opens above the tickets, so they stay where they were.
        <fieldset
          ref={shapesList}
          className="absolute right-0 bottom-full m-0 mb-1.5 grid w-full grid-cols-2 gap-1.5 border-0 p-0"
        >
          <legend className="sr-only">{`${NAME[open]} size`}</legend>
          {FORMATS.map((key) => {
            const label = `${NAME[open]} ${ratio(key)}, ${VIDEO_FORMATS[key].label}`;
            const inner = (
              <>
                <span aria-hidden="true" className={TILE}>
                  <ShapeMark format={key} />
                </span>
                <span className="flex flex-col leading-tight">
                  {ratio(key)}
                  <span className="text-xs font-medium text-ink-soft">{USE[key]}</span>
                </span>
              </>
            );
            const job = open;
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                onClick={(event) => start(job, key, tickets.current[job] ?? event.currentTarget)}
                className={TICKET}
              >
                {inner}
              </button>
            );
          })}
        </fieldset>
      )}
      <ul className="grid grid-cols-2 gap-1.5">
        {JOBS.map((kind) => {
          const off = kind === "mp4" ? mp4Off : stillsOff;
          return (
            <li key={kind}>
              <button
                ref={(node) => {
                  tickets.current[kind] = node;
                }}
                type="button"
                aria-expanded={open === kind}
                disabled={off}
                aria-describedby={describe(off)}
                onClick={() => setOpen((now) => (now === kind ? null : kind))}
                className={TICKET}
              >
                <span aria-hidden="true" className={TILE}>
                  {MARK[kind]}
                </span>
                <span>
                  {NAME[kind]} <span className="font-medium text-ink-soft">{TYPE[kind]}</span>
                </span>
              </button>
            </li>
          );
        })}
        <li>
          {"href" in card ? (
            <a href={card.href} download={card.filename ?? true} className={TICKET}>
              <span aria-hidden="true" className={TILE}>
                <CardMark />
              </span>
              <span>
                Share card <span className="font-medium text-ink-soft">PNG</span>
              </span>
            </a>
          ) : (
            <button type="button" disabled aria-describedby={cardId} className={TICKET}>
              <span aria-hidden="true" className={TILE}>
                <CardMark />
              </span>
              Share card
            </button>
          )}
        </li>
        {links.map((link) => {
          const inner = (
            <>
              <span aria-hidden="true" className={TILE}>
                <LinkMark href={link.href} />
              </span>
              {link.label}
            </>
          );
          return (
            <li key={link.href}>
              {link.route ? (
                <a href={link.href} className={TICKET}>
                  {inner}
                </a>
              ) : (
                <Link href={link.href} className={TICKET}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {note && (
        // Floats under the tickets, so they stay where they were.
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
        <Rendering
          title={renderingTitle(state.job)}
          value={percent(state)}
          left={left}
          reminder={showReminder(privateNames)}
          onCancel={cancel}
        />
      )}
    </section>
  );
}

function Rendering({
  title,
  value,
  left,
  reminder,
  onCancel,
}: {
  title: string;
  value: number;
  /** "About 2 min left", once the speed so far means something. */
  left: string | null;
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
          {title}
        </p>
        <div
          role="progressbar"
          aria-labelledby={titleId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={left ? `${value}%, ${left.toLowerCase()}` : `${value}%`}
          className="h-3 w-full overflow-hidden rounded-full border border-ink"
        >
          <div
            className="h-full bg-ink motion-safe:transition-[width] motion-safe:duration-200"
            style={{ width: `${value}%` }}
          />
        </div>
        {/* A phone takes minutes over a video: the figure says it is moving and how long is left. */}
        <p className="flex justify-between gap-4 text-sm text-ink-soft tabular-nums" aria-hidden>
          <span className="font-semibold text-ink">{value}%</span>
          {left && <span>{left}</span>}
        </p>
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

/**
 * The marks are drawn on a 16 × 16 pixel grid in square cells, like Cell and the city: paper on
 * the ink tile, with the one green cell of the GitHub graph as the accent.
 */
function Mark({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-5" shapeRendering="crispEdges">
      {children}
    </svg>
  );
}

const PAPER = "var(--color-paper)";
const GREEN = "var(--color-cell)";

/** A film frame with sprocket holes and a green play mark. */
function VideoMark() {
  return (
    <Mark>
      <rect x="1" y="3" width="14" height="10" fill={PAPER} />
      {[2, 5, 8, 11, 13].map((x) => (
        <rect key={`t${x}`} x={x} y="4" width="1" height="1" fill="var(--color-ink)" />
      ))}
      {[2, 5, 8, 11, 13].map((x) => (
        <rect key={`b${x}`} x={x} y="11" width="1" height="1" fill="var(--color-ink)" />
      ))}
      <rect x="6" y="6" width="1" height="4" fill={GREEN} />
      <rect x="7" y="6" width="1" height="4" fill={GREEN} />
      <rect x="8" y="7" width="1" height="2" fill={GREEN} />
      <rect x="9" y="7" width="1" height="2" fill={GREEN} />
    </Mark>
  );
}

/** Three slides fanned out, the front one with a green square of the graph. */
function SlidesMark() {
  return (
    <Mark>
      <rect x="6" y="1" width="9" height="8" fill={PAPER} opacity="0.45" />
      <rect x="4" y="3" width="9" height="8" fill={PAPER} opacity="0.7" />
      <rect x="1" y="6" width="10" height="9" fill={PAPER} />
      <rect x="3" y="8" width="3" height="3" fill={GREEN} />
      <rect x="3" y="12" width="6" height="1" fill="var(--color-ink)" />
    </Mark>
  );
}

/** A page with its corner folded and three lines of text. */
function PdfMark() {
  return (
    <Mark>
      <rect x="3" y="1" width="7" height="14" fill={PAPER} />
      <rect x="10" y="4" width="3" height="11" fill={PAPER} />
      <rect x="10" y="1" width="3" height="3" fill={GREEN} />
      {[6, 9, 12].map((y) => (
        <rect key={y} x="5" y={y} width={y === 12 ? 4 : 6} height="1" fill="var(--color-ink)" />
      ))}
    </Mark>
  );
}

/** The share card: a picture square and two lines. */
function CardMark() {
  return (
    <Mark>
      <rect x="1" y="3" width="14" height="10" fill={PAPER} />
      <rect x="3" y="5" width="4" height="4" fill={GREEN} />
      <rect x="8" y="5" width="5" height="1" fill="var(--color-ink)" />
      <rect x="8" y="7" width="3" height="1" fill="var(--color-ink)" />
      <rect x="3" y="10" width="10" height="1" fill="var(--color-ink)" />
    </Mark>
  );
}

/** A video's shape drawn as itself: the frame at its ratio, with a green play mark. */
function ShapeMark({ format }: { format: ExportFormat }) {
  const { width, height } = VIDEO_FORMATS[format];
  const scale = 14 / Math.max(width, height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  return (
    <Mark>
      <rect x={8 - w / 2} y={8 - h / 2} width={w} height={h} fill={PAPER} />
      <rect x="7" y="6" width="1" height="4" fill={GREEN} />
      <rect x="8" y="7" width="1" height="2" fill={GREEN} />
    </Mark>
  );
}

/** The way on: the dashboard's tiles, a new recap's plus, or a door for signing in. */
function LinkMark({ href }: { href: string }) {
  if (href === "/dashboard") {
    return (
      <Mark>
        <rect x="2" y="2" width="5" height="5" fill={GREEN} />
        <rect x="9" y="2" width="5" height="5" fill={PAPER} />
        <rect x="2" y="9" width="5" height="5" fill={PAPER} />
        <rect x="9" y="9" width="5" height="5" fill={PAPER} />
      </Mark>
    );
  }
  if (href === "/") {
    return (
      <Mark>
        <rect x="6" y="2" width="4" height="12" fill={GREEN} />
        <rect x="2" y="6" width="12" height="4" fill={GREEN} />
      </Mark>
    );
  }
  return (
    <Mark>
      <rect x="8" y="1" width="6" height="14" fill={PAPER} />
      <rect x="2" y="7" width="7" height="2" fill={GREEN} />
      <rect x="6" y="5" width="2" height="6" fill={GREEN} />
    </Mark>
  );
}
