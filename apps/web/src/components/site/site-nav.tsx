"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { NAV_LINKS } from "./nav-links";

const link =
  "inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 font-semibold text-fg hover:bg-overlay active:bg-line";

/**
 * The site header's navigation. On the landing page links are in-page anchors; elsewhere they go
 * back to the landing page (`base="/"`). Small screens get a disclosure menu that closes on
 * Escape or after a link is chosen.
 */
export function SiteNav({
  base = "",
  action,
  repo,
}: {
  base?: "" | "/";
  action: ReactNode;
  /** The link to the source, beside the action on every screen size. */
  repo?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {NAV_LINKS.map(({ id, label }) => (
            <li key={id}>
              <a href={`${base}#${id}`} className={link}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-2">
        {repo}
        <div className="hidden sm:block">{action}</div>
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 items-center justify-center rounded-[var(--radius-control)] border border-line hover:bg-overlay active:bg-line lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="currentColor">
            {open ? (
              <path d="M4.3 3 3 4.3 8.7 10 3 15.7 4.3 17 10 11.3l5.7 5.7 1.3-1.3L11.3 10 17 4.3 15.7 3 10 8.7z" />
            ) : (
              <>
                <rect x="2" y="4" width="16" height="2.4" rx="1" />
                <rect x="2" y="8.8" width="16" height="2.4" rx="1" />
                <rect x="2" y="13.6" width="16" height="2.4" rx="1" />
              </>
            )}
          </svg>
        </button>
      </div>
      <nav
        id={menuId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-[#010409] px-4 pt-2 pb-6 lg:hidden"
      >
        <ul className="flex flex-col">
          {NAV_LINKS.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`${base}#${id}`}
                onClick={() => setOpen(false)}
                className={`${link} w-full text-xl`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-4 sm:hidden">{action}</div>
      </nav>
    </>
  );
}
