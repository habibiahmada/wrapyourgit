"use client";

import Image from "next/image";
import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

export type ReelFrame = { file: string; label: string; alt: string };

/**
 * The sample frames as a reel that drifts on its own: to the end, back to the start, again.
 * Drag it with a mouse, swipe it on touch, or scroll it with the keyboard; it stops while you hover,
 * focus or hold it, and picks up again a moment after you let go. Reduced motion never starts it.
 * No scrollbar and no pause button: the maintainer removed both (R-39 override, DESIGN.md).
 */
export function FrameReel({ frames }: { frames: ReelFrame[] }) {
  const track = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const hovering = useRef(false);
  const busy = useRef(0); // timestamp until which the user is in control
  const direction = useRef(1);
  const drag = useRef<{ x: number; left: number } | null>(null);

  const hold = useCallback(() => {
    busy.current = performance.now() + 2500;
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const max = element.scrollWidth - element.clientWidth;
      if (max > 0 && now > busy.current && !hovering.current) {
        const next = element.scrollLeft + direction.current * dt * 0.06;
        if (next >= max) direction.current = -1;
        if (next <= 0) direction.current = 1;
        element.scrollLeft = Math.max(0, Math.min(max, next));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    hold();
    if (event.pointerType !== "mouse" || !track.current) return;
    drag.current = { x: event.clientX, left: track.current.scrollLeft };
    track.current.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current || !track.current) return;
    hold();
    track.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="relative">
      <section
        ref={track}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the reel scrolls, so it must be reachable by keyboard
        tabIndex={0}
        aria-label="Frames from a sample recap. Drag or use arrow keys to scroll."
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
        className="flex cursor-grab gap-5 overflow-x-auto px-4 py-6 select-none [scrollbar-width:none] active:cursor-grabbing sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {frames.map((frame, i) => (
          <figure
            key={frame.file}
            className={`w-56 shrink-0 sm:w-64 ${i % 2 ? "translate-y-6" : ""}`}
          >
            <Image
              src={`/landing/sample-${frame.file}.webp`}
              alt={frame.alt}
              width={540}
              height={675}
              draggable={false}
              sizes="16rem"
              className="pointer-events-none h-auto w-full rounded-xl border border-line"
            />
            <figcaption className="mt-3 text-sm font-semibold text-muted">{frame.label}</figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
}
