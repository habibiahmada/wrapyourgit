"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type AppPage = "dashboard" | "settings" | "recap";

/**
 * The signed-in account as one control, the way GitHub does it: the avatar opens a short menu
 * with where you are signed in as, your dashboard, your story, Settings and Sign out. A
 * disclosure, not an ARIA menu: Tab moves through its links, Escape and a click outside close it.
 */
export function AccountMenu({
  login,
  avatarUrl,
  current,
  storyHref,
}: {
  login: string;
  avatarUrl: string;
  current: AppPage;
  storyHref: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const item =
    "flex min-h-11 w-full items-center rounded-[var(--radius-control)] px-3 text-left text-fg hover:bg-overlay active:bg-line aria-[current=page]:font-semibold";

  return (
    <div ref={root} className="relative">
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-1.5 hover:bg-overlay active:bg-line"
      >
        <span className="sr-only">Account menu for @{login}</span>
        <Image
          src={avatarUrl}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full border border-line"
        />
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`size-4 fill-muted motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
        </svg>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full right-0 z-50 mt-2 w-60 rounded-xl border border-line bg-surface p-2 shadow-[0_12px_32px_rgba(1,4,9,0.6)]"
      >
        <p className="border-b border-line px-3 pt-1 pb-3 text-sm text-muted">
          Signed in as <span className="block truncate font-semibold text-fg">@{login}</span>
        </p>
        <nav aria-label="Account" className="py-2">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            aria-current={current === "dashboard" ? "page" : undefined}
            className={item}
          >
            Your dashboard
          </Link>
          <Link
            href={storyHref}
            onClick={() => setOpen(false)}
            aria-current={current === "recap" ? "page" : undefined}
            className={item}
          >
            Your story
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            aria-current={current === "settings" ? "page" : undefined}
            className={item}
          >
            Settings
          </Link>
        </nav>
        <form action="/api/auth/signout" method="post" className="border-t border-line pt-2">
          <button type="submit" className={item}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
