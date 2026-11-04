import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { Suspense } from "react";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { SiteNav } from "./site-nav";

/**
 * Sticky header for the public pages, in GitHub's header colour with a hairline border. Solid, no
 * blur (R-10).
 */
export function SiteHeader({ base = "" }: { base?: "" | "/" }) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-[#010409]"
      // The anchor of every page transition: the header never slides (globals.css).
      style={{ viewTransitionName: "site-header" }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-overlay focus:px-4 focus:py-3 focus:font-semibold"
      >
        Skip to content
      </a>
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="inline-flex min-h-11 items-center gap-2 text-lg font-bold hover:text-muted"
        >
          {/* A week of contribution cells as the mark: the product is the graph. */}
          <span aria-hidden className="grid grid-cols-3 gap-[2px]">
            {["#0e4429", "#26a641", "#39d353", "#006d32", "#39d353", "#26a641"].map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed six-cell mark
              <span key={i} className="size-[6px] rounded-[1.5px]" style={{ background: c }} />
            ))}
          </span>
          WrapYourGit
          <span className="rounded-full border border-line px-2 text-xs font-semibold text-muted tabular-nums">
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
    <Link href="/dashboard" transitionTypes={["nav-forward"]} className={button.primary}>
      Your dashboard
    </Link>
  );
}
