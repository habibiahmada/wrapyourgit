import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setPrivateNamesAction } from "@/app/recap/actions";
import { setPublicRecapHiddenAction } from "@/app/settings/actions";
import { LoadingCell } from "@/components/loading-cell";
import {
  FallbackTransition,
  PageTransition,
  RevealTransition,
} from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { getPrivateNamesChoice } from "@/server/privacy";
import { isHidden } from "@/server/public-recaps";
import { recapPath } from "@/server/routes";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

/*
 * Account settings. "Delete my data" lives here, not on the dashboard: the dashboard is where
 * people arrive to see their year, and a delete form is the wrong first thing to meet there.
 */
export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <FallbackTransition>
            <LoadingCell label="Opening your settings…" />
          </FallbackTransition>
        }
      >
        <RevealTransition>
          <Settings searchParams={searchParams} />
        </RevealTransition>
      </Suspense>
    </div>
  );
}

async function Settings({
  searchParams,
}: {
  searchParams: PageProps<"/settings">["searchParams"];
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const [choice, hidden] = await Promise.all([
    getPrivateNamesChoice(user.id),
    isHidden(user.githubId),
  ]);
  const publicPath = recapPath(user.login);
  const { delete: deleteFlag } = await searchParams;
  const unconfirmed = deleteFlag === "unconfirmed";

  return (
    <>
      <SiteHeader variant="app" current="settings" />
      <PageTransition>
        <main
          id="main"
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-8"
        >
          <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>

          <section aria-labelledby="account-title">
            <h2 id="account-title" className="border-b border-line pb-2 text-xl font-bold">
              Account
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <Image
                src={user.avatarUrl}
                alt=""
                width={56}
                height={56}
                className="rounded-full border border-line"
              />
              <div>
                <p className="font-semibold">@{user.login}</p>
                <p className="text-muted">
                  Signed in with GitHub. Read-only, no repository access.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="public-title">
            <h2 id="public-title" className="border-b border-line pb-2 text-xl font-bold">
              Public recap
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              Every GitHub username has a recap built from its public activity. Yours is at{" "}
              <a href={publicPath} className="font-semibold text-fg underline underline-offset-4">
                {publicPath}
              </a>
              . If you hide it, visitors see a note saying so, and the stored copy is deleted.
            </p>
            <form action={setPublicRecapHiddenAction} className="mt-5">
              <button
                type="submit"
                role="switch"
                aria-checked={hidden}
                aria-describedby="public-status"
                name="hide"
                value={hidden ? "no" : "yes"}
                className="group inline-flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-1 font-semibold"
              >
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border motion-safe:transition-colors ${
                    hidden
                      ? "border-green bg-green-button group-hover:bg-[#2ea043] group-active:bg-[#1f7a30]"
                      : "border-muted bg-overlay group-hover:bg-line group-active:bg-[#282e33]"
                  }`}
                >
                  <span
                    className={`absolute size-4 rounded-full bg-fg motion-safe:transition-transform ${
                      hidden ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>
                Hide my public recap
                <span aria-hidden="true" className="text-muted">
                  {hidden ? "On" : "Off"}
                </span>
              </button>
            </form>
            {/* Read with the switch: after the switch is pressed the page re-renders, and a status
                region that arrives with it is not announced reliably on its own. */}
            <p id="public-status" role="status" className="mt-2 max-w-2xl text-muted">
              {hidden
                ? `Hidden. Visitors read "@${user.login} has hidden their recap".`
                : "Public. Your private repositories are never named there."}
            </p>
          </section>

          <section aria-labelledby="private-title">
            <h2 id="private-title" className="border-b border-line pb-2 text-xl font-bold">
              Private repositories
            </h2>
            <p role="status" className="mt-4 font-semibold">
              {choice === null
                ? "Not chosen yet; you'll be asked before your story"
                : choice
                  ? "Shown in your story and your files"
                  : "Hidden in your story and your files"}
            </p>
            <p className="mt-1 max-w-2xl text-muted">Your public page never shows them.</p>
            <form action={setPrivateNamesAction} className="mt-5">
              <input type="hidden" name="redirectTo" value="/settings" />
              <button
                type="submit"
                name="show"
                value={choice ? "no" : "yes"}
                className={button.secondary}
              >
                {choice ? "Hide private repository names" : "Show private repository names"}
              </button>
            </form>
          </section>

          <section aria-labelledby="sessions-title">
            <h2 id="sessions-title" className="border-b border-line pb-2 text-xl font-bold">
              Devices
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              Signed in on a shared or lost computer? This signs you out everywhere, including here.
              Your recap stays, and you can sign in again any time.
            </p>
            <form action="/api/auth/signout" method="post" className="mt-5">
              <input type="hidden" name="scope" value="everywhere" />
              <button type="submit" className={button.secondary}>
                Sign out on all devices
              </button>
            </form>
          </section>

          <section aria-labelledby="delete-title">
            <h2 id="delete-title" className="border-b border-line pb-2 text-xl font-bold">
              Danger zone
            </h2>
            <div className="mt-4 rounded-xl border border-[#f8514966] p-6">
              <h3 className="font-semibold">Delete my data</h3>
              <p className="mt-1 max-w-2xl text-muted">
                Deletes your account, your recap and your stored GitHub tokens, and revokes
                WrapYourGit&apos;s access on GitHub. This can&apos;t be undone.
              </p>
              <form
                action="/api/account/delete"
                method="post"
                className="mt-5 flex flex-col items-start gap-3"
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="confirm"
                    value="delete"
                    required
                    aria-describedby={unconfirmed ? "delete-error" : undefined}
                    className="size-5 cursor-pointer accent-[#da3633]"
                  />
                  I understand this deletes everything WrapYourGit stored for @{user.login}.
                </label>
                {unconfirmed && (
                  <p id="delete-error" role="alert" className="font-semibold text-[#ff7b72]">
                    Tick the box to confirm, then delete.
                  </p>
                )}
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-line bg-overlay px-5 font-semibold text-[#ff7b72] hover:border-[#f85149] hover:bg-[#da3633] hover:text-white active:bg-[#b62324]"
                >
                  Delete my data
                </button>
              </form>
            </div>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
