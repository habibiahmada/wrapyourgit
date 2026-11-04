import type { RecapData } from "@wyg/schema";
import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { getRecap } from "@/server/recaps";
import { nextSyncAt } from "@/server/sync-policy";
import { SyncForm } from "./sync-form";

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <p role="status" className="px-4 py-14 text-lg sm:px-10">
            Loading your dashboard…
          </p>
        }
      >
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard">["searchParams"];
}) {
  // Request-time render: the sync cooldown below depends on the current time.
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const recap = await getRecap(user.id);
  const retryAt = nextSyncAt(recap?.syncedAt ?? null, new Date());
  const { delete: deleteFlag } = await searchParams;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink px-4 py-4 sm:px-10">
        <p className="text-lg font-extrabold">WrapYourGit · {EDITION_YEAR}</p>
        <div className="flex items-center gap-4">
          <span className="text-base">@{user.login}</span>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className={button.quiet}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="px-4 py-12 sm:px-10">
          {recap ? (
            <RecapSummary data={recap.data} syncedAt={recap.syncedAt} retryAt={retryAt} />
          ) : (
            <div className="max-w-2xl">
              <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">
                No recap yet.
              </h1>
              <p className="mt-4 text-lg">
                Build your {EDITION_YEAR} recap from your GitHub activity. WrapYourGit reads your
                contribution counts, never your code.
              </p>
              <div className="mt-8">
                <SyncForm label={`Build my ${EDITION_YEAR} recap`} retryAt={null} />
              </div>
            </div>
          )}
        </section>

        <section className="mt-auto border-t-2 border-ink px-4 py-10 sm:px-10">
          <h2 className="text-2xl font-extrabold">Delete my data</h2>
          <p className="mt-2 max-w-2xl text-base">
            Deletes your account, your recap and your stored GitHub tokens, and revokes
            WrapYourGit&apos;s access on GitHub. This can&apos;t be undone.
          </p>
          <form
            action="/api/account/delete"
            method="post"
            className="mt-4 flex flex-col items-start gap-3"
          >
            <label className="flex items-center gap-3 text-base">
              <input
                type="checkbox"
                name="confirm"
                value="delete"
                required
                className="size-5 accent-ink"
              />
              I understand this deletes everything WrapYourGit stored for @{user.login}.
            </label>
            {deleteFlag === "unconfirmed" && (
              <p role="alert" className="font-bold">
                Tick the box to confirm, then delete.
              </p>
            )}
            <button type="submit" className={button.secondary}>
              Delete my data
            </button>
          </form>
        </section>
      </main>
    </>
  );
}

function RecapSummary({
  data,
  syncedAt,
  retryAt,
}: {
  data: RecapData;
  syncedAt: Date;
  retryAt: Date | null;
}) {
  const { contributions, languages, meta } = data;
  const topLanguage = languages.top[0];
  const recentWeek = contributions.calendar.slice(-7);

  return (
    <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <p className="text-lg font-bold">
          {meta.isFinal ? `Your ${meta.year}` : `Your ${meta.year} so far, up to ${meta.periodEnd}`}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-6">
          <h1 className="text-7xl leading-[0.9] font-extrabold tracking-tight tabular-nums sm:text-9xl">
            {contributions.total.toLocaleString("en-US")}
          </h1>
          {/* The one motif per page (DESIGN.md web): the last seven days as lit cells. */}
          <div
            className="mb-3 flex gap-1.5"
            role="img"
            aria-label="Contributions in your last seven days"
          >
            {recentWeek.map((day) => (
              <span
                key={day.date}
                className={`size-5 rounded-[4px] ${day.count > 0 ? "bg-heat-2" : "bg-ink/10"}`}
              />
            ))}
          </div>
        </div>
        <p className="mt-2 text-xl font-bold">contributions</p>

        <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-8 gap-y-6 text-lg">
          <div>
            <dt className="text-ink-soft">Active days</dt>
            <dd className="text-3xl font-extrabold tabular-nums">{contributions.activeDays}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Longest streak</dt>
            <dd className="text-3xl font-extrabold tabular-nums">
              {contributions.longestStreak.days} days
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Top language</dt>
            <dd className="text-3xl font-extrabold">{topLanguage?.name ?? "Not enough data"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Commits</dt>
            <dd className="text-3xl font-extrabold tabular-nums">
              {contributions.commits.toLocaleString("en-US")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col items-start gap-6 lg:pt-10">
        <Link href="/recap" className={button.primary}>
          Play your story
        </Link>
        <div>
          <p className="mb-3 text-base">
            Last synced{" "}
            {syncedAt.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "UTC",
            })}{" "}
            UTC.
          </p>
          <SyncForm
            label="Sync again"
            retryAt={retryAt?.toISOString() ?? null}
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}
