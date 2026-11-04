import type { RecapData } from "@wyg/schema";
import { EDITION_YEAR } from "@wyg/schema";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "@wyg/video/copy";
import { runnerUps } from "@wyg/video/present";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LanguageBadge } from "@/components/language-badge";
import { LoadingCell } from "@/components/loading-cell";
import { CellField, calendarLevels } from "@/components/site/cell-field";
import {
  FallbackTransition,
  PageTransition,
  RevealTransition,
} from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { getRecap, isShared } from "@/server/recaps";
import { nextSyncAt } from "@/server/sync-policy";
import { setShareAction } from "./actions";
import { YearComparison } from "./compare";
import { InstallPrivate } from "./install-private";
import { SyncForm } from "./sync-form";

/*
 * The signed-in home, laid out like a GitHub profile (DESIGN.md web): avatar and handle on the
 * left, the year's contribution graph, then boxes with hairline borders on the dark canvas.
 */

/** Signed-in only: nothing here for search engines. */
export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <FallbackTransition>
            <LoadingCell label="Opening your dashboard…" />
          </FallbackTransition>
        }
      >
        <RevealTransition>
          <Dashboard searchParams={searchParams} />
        </RevealTransition>
      </Suspense>
    </div>
  );
}

const n = (value: number) => value.toLocaleString("en-US");
const box = "rounded-xl border border-line bg-surface";
const sectionTitle = "text-2xl font-bold sm:text-3xl";

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
  const shared = recap ? await isShared(user.id) : false;
  const { share: shareFlag } = await searchParams;

  return (
    <>
      <SiteHeader variant="app" current="dashboard" />

      <PageTransition>
        <main id="main" className="flex flex-1 flex-col">
          {recap ? (
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[18rem_1fr]">
              <Profile
                data={recap.data}
                avatarUrl={user.avatarUrl}
                login={user.login}
                syncedAt={recap.syncedAt}
                retryAt={retryAt}
              />
              <div className="flex min-w-0 flex-col gap-10">
                <Overview data={recap.data} />
                <Highlights data={recap.data} />
                <StarredSection data={recap.data} />
                <section aria-labelledby="compare-title">
                  <h2 id="compare-title" className={sectionTitle}>
                    {recap.data.meta.year} vs {recap.data.meta.year - 1}
                  </h2>
                  <p className="mt-2 mb-6 max-w-2xl text-muted">
                    The same stretch of both years, side by side, so the comparison is fair while{" "}
                    {recap.data.meta.year} is still running.
                  </p>
                  <YearComparison data={recap.data} />
                </section>
                <ShareSection
                  login={user.login}
                  shared={shared}
                  syncedAt={recap.syncedAt}
                  stale={shareFlag === "stale"}
                />
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
          {recap && <InstallPrivate />}
        </main>
      </PageTransition>
    </>
  );
}

function EmptyState() {
  return (
    <section className="flex-1 px-4 py-16 sm:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="max-w-2xl">
          <h1 className="text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl">
            Cell is ready when you are.
          </h1>
          <p className="mt-6 text-lg text-muted sm:text-xl">
            Build your {EDITION_YEAR} recap from your GitHub activity. WrapYourGit reads your
            contribution counts, never your code. It takes about 20 seconds.
          </p>
          <div className="mt-10">
            <SyncForm label={`Build my ${EDITION_YEAR} recap`} retryAt={null} />
          </div>
        </div>
        <Image
          src="/art/cutout-cell-sleep.png"
          alt="Cell asleep, waiting for your first recap"
          width={1200}
          height={900}
          preload
          sizes="(min-width: 1024px) 45vw, 90vw"
          className="h-auto w-full"
        />
      </div>
    </section>
  );
}

/** The left column, like a GitHub profile sidebar. */
function Profile({
  data,
  avatarUrl,
  login,
  syncedAt,
  retryAt,
}: {
  data: RecapData;
  avatarUrl: string;
  login: string;
  syncedAt: Date;
  retryAt: Date | null;
}) {
  const { identity, profile } = data;
  const art = identity.archetype ? `skin-${identity.archetype}` : "cutout-cell-proud";
  return (
    <aside className="flex flex-col gap-5">
      <Image
        src={avatarUrl}
        alt=""
        width={296}
        height={296}
        preload
        className="hidden size-56 rounded-full border border-line lg:block lg:size-72"
      />
      <div>
        {profile.name && <p className="text-2xl font-bold">{profile.name}</p>}
        <p className="text-xl text-muted">@{login}</p>
      </div>
      <Link href="/recap" transitionTypes={["nav-forward"]} className={`${button.primary} w-full`}>
        Play your story
      </Link>
      <div>
        <SyncForm label="Sync again" retryAt={retryAt?.toISOString() ?? null} variant="secondary" />
        <p className="text-sm text-muted">
          Last synced{" "}
          {syncedAt.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          })}{" "}
          UTC
        </p>
      </div>
      <div className={`overflow-hidden ${box}`}>
        <div className="border-b border-line bg-canvas px-3 pt-3">
          <Image
            src={`/art/${art}.png`}
            alt={
              identity.archetype
                ? `Cell dressed as the ${ARCHETYPE_LABELS[identity.archetype]}`
                : "Cell, proud of your year"
            }
            width={1200}
            height={900}
            sizes="18rem"
            className="h-auto w-full"
          />
        </div>
        <p className="px-4 py-3 text-sm text-muted">
          Your archetype:{" "}
          <span className="font-semibold text-fg">
            {identity.archetype ? ARCHETYPE_LABELS[identity.archetype] : NO_ARCHETYPE}
          </span>
        </p>
      </div>
    </aside>
  );
}

function Overview({ data }: { data: RecapData }) {
  const { contributions, meta } = data;
  return (
    <section aria-labelledby="dash-title">
      <h1 id="dash-title" className="text-xl font-semibold">
        <span className="text-4xl font-bold tabular-nums sm:text-5xl">
          {n(contributions.total)}
        </span>{" "}
        contributions in {meta.year}
        {!meta.isFinal && <span className="text-muted"> so far, up to {meta.periodEnd}</span>}
      </h1>
      {contributions.privateCount.status === "ok" && contributions.privateCount.value > 0 && (
        <p className="mt-2 text-muted">
          {n(contributions.privateCount.value)} of them went to private repositories, yours and your
          organisations'. They count, and their names stay private.
        </p>
      )}
      {/* The year as GitHub draws it on your profile. */}
      <div className={`mt-4 p-4 ${box}`}>
        <CellField
          levels={calendarLevels(contributions.calendar)}
          className="block aspect-[53/7] w-full"
        />
        <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted" aria-hidden>
          Less
          {["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"].map((c) => (
            <span
              key={c}
              className="size-2.5 rounded-[2px] ring-1 ring-white/10"
              style={{ background: c }}
            />
          ))}
          More
        </div>
      </div>
    </section>
  );
}

function Highlights({ data }: { data: RecapData }) {
  const { contributions, languages, identity, engineering } = data;
  const also = identity.archetype ? runnerUps(identity) : [];
  const stats = [
    { label: "Active days", value: n(contributions.activeDays) },
    { label: "Longest streak", value: `${contributions.longestStreak.days} days` },
    { label: "Commits", value: n(contributions.commits) },
    { label: "Pull requests", value: n(engineering.prsOpened) },
    { label: "Reviews", value: n(engineering.reviews) },
  ];
  return (
    <section aria-labelledby="highlights-title" className="flex flex-col gap-6">
      <h2 id="highlights-title" className="sr-only">
        Highlights
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={`reveal p-4 ${box}`}>
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`reveal p-5 ${box}`}>
          <h3 className="text-sm font-semibold text-muted">Your archetype</h3>
          <p className="mt-1 text-3xl font-bold">
            {identity.archetype ? ARCHETYPE_LABELS[identity.archetype] : NO_ARCHETYPE}
          </p>
          {also.length > 0 && (
            <p className="mt-1 text-muted">
              also part {also.map((id) => ARCHETYPE_LABELS[id]).join(" and part ")}
            </p>
          )}
          {identity.reasons.length > 0 && (
            <ul className="mt-4 space-y-2">
              {identity.reasons.map((reason) => (
                <li key={reason} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 size-2.5 shrink-0 rounded-[2px] bg-[#26a641]"
                  />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`reveal p-5 ${box}`}>
          <h3 className="text-sm font-semibold text-muted">Languages you lived in</h3>
          {languages.top.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {languages.top.map((language) => (
                <li key={language.name} className="flex items-center gap-3">
                  <LanguageBadge name={language.name} color={language.color} size={28} />
                  <span className="flex-1 font-semibold">{language.name}</span>
                  <span className="text-muted tabular-nums">
                    {Math.round(language.share * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">Not enough data yet. Sync again after a few commits.</p>
          )}
        </div>
      </div>
    </section>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/**
 * What caught your eye: repositories you starred this year (metrics.md, "Starred by you"). The
 * dashboard is private, so private repositories are named here; public surfaces drop them.
 */
function StarredSection({ data }: { data: RecapData }) {
  const { starred, languages, meta } = data;
  if (starred.status !== "ok" || starred.value.count === 0) return null;
  const { count, top, languages: starredLanguages } = starred.value;
  const wrote = languages.top[0]?.name;
  const eyed = starredLanguages[0]?.name;
  return (
    <section aria-labelledby="starred-title">
      <h2 id="starred-title" className={sectionTitle}>
        What caught your eye
      </h2>
      <p className="mt-2 mb-6 max-w-2xl text-muted">
        You starred{" "}
        <span className="font-semibold text-fg tabular-nums">
          {starred.estimated ? "~" : ""}
          {n(count)}
        </span>{" "}
        {count === 1 ? "repository" : "repositories"} in {meta.year}
        {!meta.isFinal && " so far"}.
        {wrote && eyed && wrote !== eyed && (
          <>
            {" "}
            You wrote mostly {wrote}, but starred mostly {eyed}.
          </>
        )}
      </p>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className={`reveal p-5 ${box}`}>
          <h3 className="text-sm font-semibold text-muted">The most popular ones you starred</h3>
          <ol className="mt-3 divide-y divide-line">
            {top.map((repo) => (
              <li key={repo.nameWithOwner} className="flex items-center gap-3 py-2.5">
                <a
                  href={`https://github.com/${repo.nameWithOwner}`}
                  className="min-w-0 flex-1 truncate font-semibold text-blue hover:underline"
                >
                  {repo.nameWithOwner}
                </a>
                {repo.primaryLanguage && (
                  <span className="hidden text-sm text-muted sm:inline">
                    {repo.primaryLanguage}
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted tabular-nums">
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4 fill-current">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                  </svg>
                  <span className="sr-only">Stars:</span>
                  {compact.format(repo.stars)}
                </span>
              </li>
            ))}
          </ol>
        </div>
        {starredLanguages.length > 0 && (
          <div className={`reveal p-5 ${box}`}>
            <h3 className="text-sm font-semibold text-muted">Languages you starred</h3>
            <ul className="mt-3 space-y-3">
              {starredLanguages.map((language) => (
                <li key={language.name} className="flex items-center gap-3">
                  <LanguageBadge name={language.name} color={null} size={28} />
                  <span className="flex-1 font-semibold">{language.name}</span>
                  <span className="text-muted tabular-nums">
                    {n(language.count)} {language.count === 1 ? "repo" : "repos"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Publishing is opt-in. The public page and the PNG card show the public projection: counts
 * only, private repositories never named.
 */
function ShareSection({
  login,
  shared,
  syncedAt,
  stale,
}: {
  login: string;
  shared: boolean;
  syncedAt: Date;
  stale: boolean;
}) {
  const path = `/u/${login}`;
  const synced = syncedAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return (
    <section aria-labelledby="share-title" className={`p-6 ${box}`}>
      <h2 id="share-title" className={sectionTitle}>
        Share your recap
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        {shared
          ? "Your recap page is public. Anyone with the link can see your counts and play your story. Private repositories are never named."
          : "Publish a page anyone can open, with your counts and your story. Private repositories are never named. It stays off until you turn it on."}{" "}
        It shows your data as of your last sync ({synced} UTC). If you make a repository private,
        sync again so the page stops naming it.
      </p>
      {stale && (
        <p role="alert" className="mt-3 font-semibold text-[#d29922]">
          Sync first: publishing needs data from the last 24 hours, so private repositories are up
          to date.
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <form action={setShareAction}>
          <input type="hidden" name="share" value={shared ? "off" : "on"} />
          <button type="submit" className={shared ? button.secondary : button.primary}>
            {shared ? "Stop sharing" : "Publish my recap page"}
          </button>
        </form>
        {shared && (
          <a
            href={path}
            className="inline-flex min-h-11 items-center font-semibold text-blue hover:underline"
          >
            Open {path}
          </a>
        )}
        <a href="/api/card" download className={button.quiet}>
          Download share card (PNG)
        </a>
      </div>
    </section>
  );
}
