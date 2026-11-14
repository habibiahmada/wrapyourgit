"use client";

import { VIDEO_FORMATS } from "@wyg/schema";
import type { ExportFormat } from "@wyg/video/export";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The export size as a dropdown drawn by the page, because a native select's open list keeps the
 * system's colours. A button that opens an ARIA listbox: arrows, Home and End move, Enter or Space
 * picks, Escape and a click outside close, and focus returns to the button.
 */
export function SizePicker({
  formats,
  value,
  onChange,
  disabled = false,
}: {
  formats: readonly ExportFormat[];
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
  disabled?: boolean;
}) {
  const ids = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, formats.indexOf(value)));
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const ratio = (format: ExportFormat) => format.replace("x", ":");

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, formats.indexOf(value)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  const pick = (index: number) => {
    const format = formats[index];
    if (format) onChange(format);
    close();
  };

  const onListKey = (event: React.KeyboardEvent) => {
    const last = formats.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key] ?? active);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close();
    }
  };

  return (
    <div ref={root} className="relative flex flex-col gap-1.5">
      <span id={`${ids}-label`} className="font-semibold">
        Size
      </span>
      <button
        ref={toggle}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${ids}-list`}
        aria-labelledby={`${ids}-label ${ids}-value`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
        className="flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-control)] border border-line bg-overlay px-3 text-left hover:border-muted hover:bg-line active:bg-[#2f2c26] disabled:opacity-60"
      >
        <span id={`${ids}-value`} className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{ratio(value)}</span>
          <span className="text-muted"> · {VIDEO_FORMATS[value].label}</span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`size-4 shrink-0 fill-muted motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
        </svg>
      </button>
      <div
        ref={list}
        id={`${ids}-list`}
        role="listbox"
        tabIndex={-1}
        hidden={!open}
        aria-labelledby={`${ids}-label`}
        aria-activedescendant={open ? `${ids}-${formats[active]}` : undefined}
        onKeyDown={onListKey}
        className="absolute top-full right-0 left-0 z-40 mt-1 rounded-md border border-line bg-surface p-1 shadow-[0_8px_24px_rgba(1,4,9,0.6)] focus-visible:outline-none"
      >
        {formats.map((format, index) => {
          const selected = format === value;
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox handles the keys for every option
            <div
              key={format}
              tabIndex={-1}
              id={`${ids}-${format}`}
              role="option"
              aria-selected={selected}
              onClick={() => pick(index)}
              onPointerMove={() => setActive(index)}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 ${
                index === active ? "bg-overlay outline-1 outline-blue/60" : ""
              }`}
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className={`size-4 shrink-0 fill-fg ${selected ? "" : "invisible"}`}
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
              <span className="w-10 font-semibold tabular-nums">{ratio(format)}</span>
              <span className="min-w-0 truncate text-muted">{VIDEO_FORMATS[format].label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
