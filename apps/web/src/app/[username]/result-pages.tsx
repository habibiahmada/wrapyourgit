import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import type { ReactNode } from "react";
import { Art } from "@/components/art";
import { PageTransition } from "@/components/site/page-transition";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { UsernameForm } from "@/components/username-form";
import { CLIENT_LIMIT } from "@/server/public-policy";
import { recapPath } from "@/server/routes";
import { VerifyGate } from "./verify-gate";

/*
 * What /<username> shows when there is no story to play. Same frame as the 404 page: what
 * happened as the heading, why in one line, then the one thing to do next. Retries are plain
 * links to the same address, so they run the whole lookup again.
 */

function ResultPage({
  title,
  children,
  action,
  art,
}: {
  title: string;
  children: ReactNode;
  action: ReactNode;
  art: "cutout-cell-sleep" | "cutout-cell-think";
}) {
  return (
    <>
      <SiteHeader base="/" />
      <PageTransition>
        <main id="main" className="flex flex-1 flex-col">
          <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-6 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1fr]">
            <div className="min-w-0">
              {/* Usernames run to 39 characters with no spaces: they wrap anywhere on a phone. */}
              <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance wrap-anywhere sm:text-6xl">
                {title}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">{children}</p>
              <div className="mt-10">{action}</div>
            </div>
            <Art id={art} alt="" priority className="mx-auto h-auto w-56 sm:w-72 lg:w-full" />
          </div>
        </main>
        <SiteFooter base="/" />
      </PageTransition>
    </>
  );
}

function Retry({ login, label = "Try again" }: { login: string; label?: string }) {
  return (
    <a href={recapPath(login)} className={`${button.primary} max-w-full wrap-anywhere`}>
      {label}
    </a>
  );
}

export function MissingPage({ login }: { login: string }) {
  return (
    <ResultPage
      title={`No GitHub user called @${login}`}
      art="cutout-cell-think"
      action={<UsernameForm id="username-retry" label="Try another GitHub username" />}
    >
      Check the spelling: it's the name in their github.com address.
    </ResultPage>
  );
}

export function OrganizationPage({ login }: { login: string }) {
  return (
    <ResultPage
      title={`@${login} is an organisation. Recaps are for people.`}
      art="cutout-cell-think"
      action={<UsernameForm id="username-retry" label="Try a person's GitHub username" />}
    >
      A recap follows one person's year. Try the username of someone who works there.
    </ResultPage>
  );
}

export function HiddenPage({ login }: { login: string }) {
  return (
    <ResultPage
      title={`@${login} has hidden their recap`}
      art="cutout-cell-sleep"
      action={
        <Link href="/" transitionTypes={["nav-back"]} className={button.primary}>
          Make your own recap
        </Link>
      }
    >
      Only they can see it now.
    </ResultPage>
  );
}

export function BusyPage({ login }: { login: string }) {
  return (
    <ResultPage
      title="The server is busy, try again in a few minutes"
      art="cutout-cell-sleep"
      action={<Retry login={login} label={`Try @${login} again`} />}
    >
      GitHub answers only so many questions an hour, and they're used up for now. Recaps already
      read still play.
    </ResultPage>
  );
}

export function LimitedPage({ login }: { login: string }) {
  return (
    <ResultPage
      title="That's a lot of new recaps for one hour"
      art="cutout-cell-sleep"
      action={<Retry login={login} label={`Try @${login} again`} />}
    >
      So the server's GitHub quota lasts for everyone, each visitor opens up to {CLIENT_LIMIT} new
      usernames an hour. Recaps you've already opened still play.
    </ResultPage>
  );
}

/**
 * Before the server asks GitHub about a name nobody has fetched yet (ADR-0026). The address is
 * the recap's own, so once the check passes the same page loads as the recap.
 */
export function VerifyPage({ login, siteKey }: { login: string; siteKey: string }) {
  return (
    <ResultPage
      title={`One quick check before @${login}'s recap`}
      art="cutout-cell-think"
      action={<VerifyGate siteKey={siteKey} />}
    >
      Nobody has opened this recap lately, so it has to be read from GitHub, on a quota every
      visitor shares. This check, by Cloudflare Turnstile, keeps scripts from using it up.{" "}
      <a href="/privacy" className="font-semibold text-blue hover:underline">
        What it collects
      </a>
      .
    </ResultPage>
  );
}

export function ErrorPage({ login }: { login: string }) {
  return (
    <ResultPage
      title={`Couldn't read @${login}'s ${EDITION_YEAR}`}
      art="cutout-cell-think"
      action={<Retry login={login} />}
    >
      Something went wrong while asking GitHub. Nothing was saved, so trying again starts fresh.
    </ResultPage>
  );
}

/**
 * The owner's auto-sync failed or is already running, and there is no earlier recap to play
 * instead (freshRecap serves a stored one whenever it exists). So there is nothing to open on
 * the dashboard either, which would only send the owner back here: the one action is to retry.
 */
export function OwnerErrorPage({ login, building }: { login: string; building: boolean }) {
  return (
    <ResultPage
      title={building ? "Your recap is already being built" : `Couldn't read your ${EDITION_YEAR}`}
      art="cutout-cell-think"
      action={<Retry login={login} label={building ? "Check again" : "Try again"} />}
    >
      {building
        ? "A sync of your account is already running. Check again in a minute."
        : "Something went wrong while asking GitHub for your activity. Nothing was saved, so there is no recap to open yet."}
    </ResultPage>
  );
}
