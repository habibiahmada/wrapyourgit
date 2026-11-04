import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { Suspense } from "react";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { SiteNav } from "./site-nav";

/**
 * Sticky header for the public pages. Solid ink, no blur: it sits over flat colour fields, so a
 * frosted bar would only muddy them (R-10).
 */
export function SiteHeader({ base = "" }: { base?: "" | "/" }) {
  return (
    <header className="on-dark sticky top-0 z-40 bg-ink text-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-paper focus:px-4 focus:py-3 focus:font-bold focus:text-ink"
      >
        Skip to content
      </a>
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-lg font-extrabold hover:underline"
        >
          WrapYourGit
          <span className="rounded-[4px] bg-cell px-1.5 text-sm text-ink tabular-nums">
            {EDITION_YEAR}
          </span>
        </Link>
        <SiteNav
          base={base}
          action={
            <Suspense fallback={<SignInButton />}>
              <HeaderAction />
            </Suspense>
          }
        />
      </div>
    </header>
  );
}

/** A plain link: the sign-in route redirects to GitHub, so prefetching it would be wasted. */
export function SignInButton() {
  return (
    <a href="/api/auth/signin" className={button.primary}>
      Sign in with GitHub
    </a>
  );
}

async function HeaderAction() {
  const user = await getCurrentUser();
  if (!user) return <SignInButton />;
  return (
    <Link href="/dashboard" className={button.primary}>
      Your dashboard
    </Link>
  );
}
