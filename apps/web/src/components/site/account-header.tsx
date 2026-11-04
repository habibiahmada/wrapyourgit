import { EDITION_YEAR } from "@wyg/schema";
import Image from "next/image";
import Link from "next/link";
import { button } from "@/components/ui";
import type { CurrentUser } from "@/server/auth";

/**
 * The header on signed-in pages (dashboard, settings): brand back to the landing, the account,
 * and the two account actions. `current` marks the page the user is on for screen readers.
 */
export function AccountHeader({
  user,
  current,
}: {
  user: Pick<CurrentUser, "login" | "avatarUrl">;
  current: "dashboard" | "settings";
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-[#010409]"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="inline-flex min-h-11 items-center gap-2 text-lg font-bold hover:text-muted"
        >
          WrapYourGit
          <span className="rounded-full border border-line px-2 text-xs font-semibold text-muted tabular-nums">
            {EDITION_YEAR}
          </span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/dashboard"
            transitionTypes={["nav-back"]}
            aria-current={current === "dashboard" ? "page" : undefined}
            className="hidden min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 font-semibold hover:bg-overlay aria-[current=page]:text-fg sm:inline-flex"
          >
            <Image
              src={user.avatarUrl}
              alt=""
              width={32}
              height={32}
              className="rounded-full border border-line"
            />
            @{user.login}
          </Link>
          <Link
            href="/settings"
            transitionTypes={["nav-forward"]}
            aria-current={current === "settings" ? "page" : undefined}
            className={`${button.quiet} aria-[current=page]:border-muted`}
          >
            Settings
          </Link>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className={button.quiet}>
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
