import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { Suspense } from "react";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { recapPath } from "@/server/routes";
import { SITE } from "@/site";
import { AccountMenu } from "./account-menu";
import { LogoMark } from "./logo-mark";
import { SiteNav } from "./site-nav";

type AppPage = "dashboard" | "settings" | "recap";

/**
 * The one header for every page, in GitHub's header colour with a hairline border. Solid, no blur
 * (R-10). Public pages get the section links and a sign-in or dashboard button; signed-in pages
 * (`variant="app"`) get the account: avatar to the dashboard, Settings and Sign out.
 */
export function SiteHeader(
  props: { variant?: "public"; base?: "" | "/" } | { variant: "app"; current: AppPage },
) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-head"
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
          <LogoMark />
          WrapYourGit
          {/* The edition badge gives way on the narrowest phones so the account buttons fit. */}
          <span className="hidden rounded-full border border-line px-2 text-xs font-semibold text-muted tabular-nums min-[400px]:inline">
            {EDITION_YEAR}
          </span>
        </Link>
        {props.variant === "app" ? (
          <div className="flex items-center gap-1 sm:gap-3">
            {/* The account's own buttons need the room on a phone. */}
            <RepoLink className="max-sm:hidden" />
            <Suspense fallback={null}>
              <AccountNav current={props.current} />
            </Suspense>
          </div>
        ) : (
          <SiteNav
            base={props.base ?? ""}
            repo={<RepoLink />}
            action={
              <Suspense fallback={<SignInButton />}>
                <HeaderAction />
              </Suspense>
            }
          />
        )}
      </div>
    </header>
  );
}

/**
 * The project is open source: a code icon linked to the repository. Never GitHub's mark: beside
 * "Sign in with GitHub" on a domain that isn't GitHub's, the mark made Chrome take the site for
 * a copy of GitHub (ADR-0029).
 */
function RepoLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={SITE.repository}
      title="Source code"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-fg hover:bg-overlay active:bg-line ${className}`}
    >
      <span className="sr-only">WrapYourGit's source code</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      >
        <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />
      </svg>
    </a>
  );
}

/**
 * A plain link: the sign-in route redirects to GitHub, so prefetching it would be wasted.
 * `secondary` where another action on screen is the primary one (the landing hero's field).
 */
export function SignInButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  return (
    <a href="/api/auth/signin" className={button[variant]}>
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

/** `current` marks the page the user is on, for screen readers and the active style. */
async function AccountNav({ current }: { current: AppPage }) {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <AccountMenu
      login={user.login}
      avatarUrl={user.avatarUrl}
      current={current}
      storyHref={recapPath(user.login)}
    />
  );
}
