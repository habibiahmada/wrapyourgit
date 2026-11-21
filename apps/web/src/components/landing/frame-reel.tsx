"use client";

import Image, { type StaticImageData } from "next/image";
import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

export type ReelFrame = { file: string; src: StaticImageData; alt: string };

/** A press that moved further than this was a drag of the reel, not a click on a frame. */
const DRAG_PX = 6;

const control =
  "inline-flex size-11 items-center justify-center rounded-full border border-line bg-overlay text-fg hover:border-muted hover:bg-line active:bg-[#2f2c26]";

/**
 * The sample frames as a reel that drifts on its own: to the end, back to the start, again.
 * Drag it with a mouse, swipe it on touch, or scroll it with the keyboard; it stops while you hover,
 * focus or hold it, and picks up again a moment after you let go. Reduced motion never starts it.
 *
 * Each frame is a button that opens it larger in a modal dialog over a black overlay (#199):
 * Escape, the close button or a click on the overlay closes it, and the previous and next buttons
 * or the arrow keys move through the frames. The browser returns focus to the frame on close.
 */
export function FrameReel({ frames }: { frames: ReelFrame[] }) {
  const track = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const hovering = useRef(false);
  const busy = useRef(0); // timestamp until which the user is in control
  const direction = useRef(1);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const press = useRef({ x: 0, moved: 0 });
  const [open, setOpen] = useState<number | null>(null);

  const hold = useCallback(() => {
    busy.current = performance.now() + 2500;
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const max = element.scrollWidth - element.clientWidth;
      const viewing = dialog.current?.open ?? false;
      if (max > 0 && now > busy.current && !hovering.current && !viewing) {
        const next = element.scrollLeft + direction.current * dt * 0.06;
        if (next >= max) direction.current = -1;
        if (next <= 0) direction.current = 1;
        element.scrollLeft = Math.max(0, Math.min(max, next));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    hold();
    press.current = { x: event.clientX, moved: 0 };
    if (event.pointerType !== "mouse" || !track.current) return;
    drag.current = { x: event.clientX, left: track.current.scrollLeft };
    track.current.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    press.current.moved = Math.max(press.current.moved, Math.abs(event.clientX - press.current.x));
    if (!drag.current || !track.current) return;
    hold();
    track.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const show = (index: number) => {
    // A drag that happened to end on a frame is not a click on it.
    if (press.current.moved > DRAG_PX) return;
    setOpen(index);
    dialog.current?.showModal();
  };
  const step = (by: number) =>
    setOpen((current) => (current === null ? null : (current + by + frames.length) % frames.length));
  const onDialogKey = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };
  const viewed = open === null ? null : frames[open];

  return (
    <>
      <section
        ref={track}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the reel scrolls, so it must be reachable by keyboard
        tabIndex={0}
        aria-label="Frames from a sample recap. Drag or use arrow keys to scroll; choose a frame to see it larger."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={hold}
        onKeyDown={hold}
        onFocus={hold}
        onPointerEnter={() => {
          hovering.current = true;
        }}
        onPointerLeave={() => {
          hovering.current = false;
          hold();
        }}
        className="flex cursor-grab gap-6 overflow-x-auto px-4 py-8 select-none [scrollbar-width:none] active:cursor-grabbing sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {frames.map((frame, i) => (
          <button
            key={frame.file}
            type="button"
            aria-label={`See larger: ${frame.alt}`}
            onClick={() => show(i)}
            className={`shrink-0 rounded-[var(--radius-control)] ${i % 2 ? "translate-y-6" : ""}`}
          >
            <Image
              src={frame.src}
              alt=""
              draggable={false}
              sizes="16rem"
              className="pointer-events-none h-auto w-56 sm:w-64"
            />
          </button>
        ))}
      </section>

      {/* A click on the dialog itself, not on its content, is a click on the overlay. */}
      <dialog
        ref={dialog}
        aria-label={viewed ? viewed.alt : "Story frame"}
        onClose={() => setOpen(null)}
        onKeyDown={onDialogKey}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="m-auto max-h-[100svh] max-w-[min(94vw,36rem)] overscroll-contain bg-transparent p-0 text-fg backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/85"
      >
        {viewed && (
          <figure className="grid gap-3 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted" aria-live="polite">
                {(open ?? 0) + 1} of {frames.length}
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => dialog.current?.close()}
                className={control}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <Image
              src={viewed.src}
              alt={viewed.alt}
              sizes="(max-width: 600px) 94vw, 36rem"
              className="h-auto max-h-[78svh] w-auto rounded-[var(--radius-control)] object-contain"
            />
            <figcaption className="flex items-center justify-between gap-3">
              <button type="button" aria-label="Previous frame" onClick={() => step(-1)} className={control}>
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <span className="text-center text-sm text-muted">{viewed.alt}</span>
              <button type="button" aria-label="Next frame" onClick={() => step(1)} className={control}>
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
