import type { ArchetypeId, RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "@wyg/video/copy";
import { runnerUps } from "@wyg/video/present";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { OWNER_CARD } from "@/app/recap/end-screen";
import { ExportPanel } from "@/app/recap/export-panel";
import { Art } from "@/components/art";
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
import { getPrivateNamesChoice, showFilesReminder, storyData } from "@/server/privacy";
import { getRecap } from "@/server/recaps";
import { recapPath } from "@/server/routes";
import { nextSyncAt } from "@/server/sync-policy";
import { YearComparison } from "./compare";
import { InstallPrivate } from "./install-private";
import { SyncForm } from "./sync-form";

/*
 * The signed-in home is a tool, not a page that sells (#113): a short page head with the two
 * things to do, then dense panels on the canvas, the main column for the year's numbers and a
 * sidebar for who the year made you. No landing bands, scroll reveals or scenery here, so the
 * dashboard never reads as the landing. Every figure is from the recap.
 */

/** Signed-in only: nothing here for search engines. */
export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardPage() {
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
          <Dashboard />
        </RevealTransition>
      </Suspense>
    </div>
  );
}

const n = (value: number) => value.toLocaleString("en-US");

/** "Jan 3", from a recap's ISO date (UTC, as GitHub files the day). */
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** One bordered box with a titled strip on top: the dashboard's only container. */
function Panel({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        {meta && <p className="text-sm text-muted">{meta}</p>}
      </div>
      {children}
    </section>
  );
}

async function Dashboard() {
  // Request-time render: the sync cooldown below depends on the current time.
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const recap = await getRecap(user.id);
  // No recap yet: the owner's own page builds it on the first visit, so that is where to go.
  if (!recap) redirect(recapPath(user.login));
  const retryAt = nextSyncAt(recap.syncedAt, new Date());
  // Unanswered counts as hidden: the files never name a private repository before the owner says so.
  const choice = await getPrivateNamesChoice(user.id);
  const showNames = choice ?? false;
  const { data } = recap;
  const { meta } = data;

  return (
    <>
      <SiteHeader variant="app" current="dashboard" />

      <PageTransition>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8">
          <PageHead
            data={data}
            avatarUrl={user.avatarUrl}
            login={user.login}
            syncedAt={recap.syncedAt}
            retryAt={retryAt}
          />
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="grid min-w-0 gap-6">
              <Overview data={data} />
              <Calendar data={data} />
              <Panel
                id="compare-title"
                title={`${meta.year} against ${meta.year - 1}`}
                meta="Same stretch of both years"
              >
                <YearComparison data={data} />
              </Panel>
              <div className="grid gap-6 md:grid-cols-2">
                <Languages data={data} />
                <Starred data={data} />
              </div>
            </div>
            <aside aria-label="Your profile" className="grid min-w-0 gap-6">
              <Archetype data={data} />
              <InstallPrivate />
              <Files
                data={storyData(data, showNames)}
                privateNames={showFilesReminder(choice, data)}
              />
            </aside>
          </div>
        </main>
      </PageTransition>
    </>
  );
}

/** Who and which year, the two actions, and how fresh the numbers are. */
function PageHead({
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
  const { meta, profile } = data;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={avatarUrl}
          alt=""
          width={96}
          height={96}
          preload
          className="size-16 shrink-0 rounded-full border border-line sm:size-24"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">
            {profile.name ?? login}
            <span className="font-normal text-muted"> · {meta.year}</span>
          </h1>
          <p className="truncate text-sm text-muted">
            @{login} · synced{" "}
            {syncedAt.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "UTC",
            })}{" "}
            UTC{!meta.isFinal && `, counts up to ${shortDate(meta.periodEnd)}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <SyncForm label="Sync again" retryAt={retryAt?.toISOString() ?? null} variant="secondary" />
        <Link href={recapPath(login)} transitionTypes={["nav-forward"]} className={button.primary}>
          Play your story
        </Link>
      </div>
    </div>
  );
}

/** The year's headline numbers in one grid, contributions first and in green. */
function Overview({ data }: { data: RecapData }) {
  const { contributions, engineering, meta } = data;
  const streak = contributions.longestStreak;
  const privateCount =
    contributions.privateCount.status === "ok" ? contributions.privateCount.value : 0;
  const stats = [
    {
      label: "Contributions",
      value: n(contributions.total),
      note: privateCount > 0 ? `${n(privateCount)} private` : meta.isFinal ? "" : "So far",
      lead: true,
    },
    { label: "Active days", value: n(contributions.activeDays), note: "" },
    {
      label: "Longest streak",
      value: `${n(streak.days)} ${streak.days === 1 ? "day" : "days"}`,
      note:
        streak.days > 1 && streak.start && streak.end
          ? `${shortDate(streak.start)} to ${shortDate(streak.end)}`
          : "",
    },
    { label: "Commits", value: n(contributions.commits), note: "" },
    { label: "Pull requests", value: n(engineering.prsOpened), note: "Opened" },
    { label: "Reviews", value: n(engineering.reviews), note: "For others" },
  ];
  return (
    <Panel id="overview-title" title="Overview">
      {/* A one-pixel gap over the line colour draws the grid's inner rules. */}
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface px-4 py-4">
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd
              className={`mt-1 text-2xl font-semibold tabular-nums ${stat.lead ? "text-green" : ""}`}
            >
              {stat.value}
            </dd>
            {stat.note && <dd className="text-sm text-muted tabular-nums">{stat.note}</dd>}
          </div>
        ))}
      </dl>
      {privateCount > 0 && (
        <p className="border-t border-line px-4 py-3 text-sm text-muted">
          Private contributions count in your total. Their repository names stay private.
        </p>
      )}
    </Panel>
  );
}

/** Every day of the year as a square, with the busiest one named. */
function Calendar({ data }: { data: RecapData }) {
  const { contributions, meta } = data;
  const days = contributions.calendar.length;
  const share = days > 0 ? Math.round((contributions.activeDays / days) * 100) : 0;
  const busiest = contributions.busiestDay;
  return (
    <Panel
      id="calendar-title"
      title="Contribution calendar"
      meta={`Active on ${n(contributions.activeDays)} of ${n(days)} days, ${share}%`}
    >
      <div className="px-4 py-4">
        {contributions.total > 0 ? (
          <>
            <CellField
              levels={calendarLevels(contributions.calendar)}
              fit
              className="block h-auto w-full"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
              <p className="tabular-nums">
                {busiest
                  ? `Busiest day: ${shortDate(busiest.date)}, ${n(busiest.count)} contributions`
                  : ""}
              </p>
              <div className="flex items-center gap-1 text-xs" aria-hidden>
                Less
                {["#1b1a16", "#0e4429", "#006d32", "#26a641", "#39d353"].map((c) => (
                  <span
                    key={c}
                    className="size-2.5 rounded-[2px] ring-1 ring-white/10"
                    style={{ background: c }}
                  />
                ))}
                More
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted">
            No contributions in {meta.year} yet. Push a commit, then sync again.
          </p>
        )}
      </div>
    </Panel>
  );
}

/** What each archetype's block shows, for its alt text. */
const BLOCK_ALT: Record<ArchetypeId, string> = {
  builder: "Cell in a hard hat in a city block where a building goes up under a crane",
  consistent: "Cell in a sweatband on a running track, with a podium and a clock tower",
  explorer: "Cell with a backpack in a block with a snowy mountain, a lake, tents and a lighthouse",
  collaborator: "Cell in a headset on an office campus where a team talks round café tables",
  "night-owl": "Cell in glasses in a city block late at night, most windows lit, an owl on a roof",
  "open-sourcer": "Cell cheering in a town square with a stage, a crowd, stalls and a fountain",
};

/** The archetype with what earned it, as a profile card in the sidebar. */
function Archetype({ data }: { data: RecapData }) {
  const { identity } = data;
  const id = identity.archetype;
  const also = id ? runnerUps(identity) : [];
  return (
    <Panel id="archetype-title" title="Your archetype">
      <div className="px-4 py-4">
        <Art
          id={id ? `skin-${id}` : "cutout-cell-proud"}
          alt={id ? BLOCK_ALT[id] : "Cell, proud of your year"}
          className="mx-auto h-auto w-full max-w-64"
        />
        <p className="mt-3 text-xl font-semibold">{id ? ARCHETYPE_LABELS[id] : NO_ARCHETYPE}</p>
        {also.length > 0 && (
          <p className="text-sm text-muted">
            Also part {also.map((other) => ARCHETYPE_LABELS[other]).join(" and part ")}
          </p>
        )}
        {identity.reasons.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            {identity.reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-[2px] bg-[#26a641]" />
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
            None of the archetypes' rules is met yet. A few more weeks of work usually settle it.
          </p>
        )}
      </div>
    </Panel>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Share of their own commits per language, as bars. */
function Languages({ data }: { data: RecapData }) {
  const { languages } = data;
  return (
    <Panel id="languages-title" title="Languages" meta="By your commits">
      {languages.top.length > 0 ? (
        <ul className="space-y-3 px-4 py-4">
          {languages.top.map((language) => (
            <li key={language.name}>
              <div className="flex items-center gap-2 text-sm">
                <LanguageBadge name={language.name} color={language.color} size={20} />
                <span className="flex-1 font-semibold">{language.name}</span>
                <span className="text-muted tabular-nums">{Math.round(language.share * 100)}%</span>
              </div>
              <div aria-hidden className="mt-1.5 h-1.5 rounded-full bg-overlay">
                <div
                  className="h-full rounded-full bg-[#26a641]"
                  style={{ width: `${Math.max(2, language.share * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-muted">
          Not enough commits to tell yet. Sync again after a few.
        </p>
      )}
    </Panel>
  );
}

/**
 * The most popular repositories they starred this year (metrics.md, "Starred by you"). The
 * dashboard is private, so private repositories are named here; public surfaces drop them.
 */
function Starred({ data }: { data: RecapData }) {
  const { starred, meta } = data;
  const hasStars = starred.status === "ok" && starred.value.count > 0;
  return (
    <Panel
      id="starred-title"
      title="Starred"
      meta={
        hasStars
          ? `${starred.estimated ? "About " : ""}${n(starred.value.count)} in ${meta.year}`
          : undefined
      }
    >
      {hasStars ? (
        <ol className="divide-y divide-line px-4">
          {starred.value.top.map((repo) => (
            <li key={repo.nameWithOwner} className="flex items-center gap-3 text-sm">
              <a
                href={`https://github.com/${repo.nameWithOwner}`}
                className="min-h-11 min-w-0 flex-1 truncate py-3 font-semibold text-blue hover:underline"
              >
                {repo.nameWithOwner}
              </a>
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
      ) : (
        <p className="px-4 py-4 text-sm text-muted">
          {starred.status === "ok"
            ? `You haven't starred a repository in ${meta.year} yet.`
            : "Your stars couldn't be read from GitHub this time. Sync again later."}
        </p>
      )}
    </Panel>
  );
}

/**
 * The story's files, made in this browser. Every file leaves the site, so `data` is the owner's
 * story projection: private names only when they chose to show them (ADR-0017). Kept small in the
 * sidebar: a size and four buttons.
 */
function Files({ data, privateNames }: { data: RecapData; privateNames: boolean }) {
  return (
    <Panel id="files-title" title="Download your story">
      <div className="px-4 py-4">
        <ExportPanel data={data} privateNames={privateNames} card={OWNER_CARD} />
        <p className="mt-3 text-sm text-muted">
          MP4, PNG slides or PDF, made in this browser
          {privateNames ? "." : ", without private repository names."}
        </p>
      </div>
    </Panel>
  );
}
