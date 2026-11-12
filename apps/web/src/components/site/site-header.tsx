import { EDITION_YEAR } from "@wyg/schema";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { SITE } from "@/site";
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

/** The project is open source: GitHub's mark, linked to the repository. */
function RepoLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={SITE.repository}
      title="Source code on GitHub"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-fg hover:bg-overlay active:bg-line ${className}`}
    >
      <span className="sr-only">WrapYourGit's source code on GitHub</span>
      <svg aria-hidden viewBox="0 0 16 16" className="size-6" fill="currentColor">
        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
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
    <nav aria-label="Account" className="flex items-center gap-1 sm:gap-3">
      <Link
        href="/dashboard"
        transitionTypes={["nav-back"]}
        aria-current={current === "dashboard" ? "page" : undefined}
        className="hidden min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 font-semibold hover:bg-overlay sm:inline-flex"
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
        className={`${button.quiet} whitespace-nowrap max-sm:px-3 aria-[current=page]:border-muted`}
      >
        Settings
      </Link>
      <form action="/api/auth/signout" method="post">
        <button type="submit" className={`${button.quiet} whitespace-nowrap max-sm:px-3`}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
