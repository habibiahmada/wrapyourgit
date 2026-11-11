import { EDITION_YEAR } from "@wyg/schema";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
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
          <Suspense fallback={null}>
            <AccountNav current={props.current} />
          </Suspense>
        ) : (
          <SiteNav
            base={props.base ?? ""}
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

/** A plain link: the sign-in route redirects to GitHub, so prefetching it would be wasted. */
/** Secondary where another action on screen is the primary one (the landing hero's field). */
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
