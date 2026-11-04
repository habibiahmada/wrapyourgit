import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingCell } from "@/components/loading-cell";
import { AccountHeader } from "@/components/site/account-header";
import {
  FallbackTransition,
  PageTransition,
  RevealTransition,
} from "@/components/site/page-transition";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

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
  const { delete: deleteFlag } = await searchParams;
  const unconfirmed = deleteFlag === "unconfirmed";

  return (
    <>
      <AccountHeader user={user} current="settings" />
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
