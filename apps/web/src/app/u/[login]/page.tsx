import type { RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "@wyg/video/copy";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClosingSection } from "@/components/landing/sections";
import { LoadingCell } from "@/components/loading-cell";
import { CellField, calendarLevels } from "@/components/site/cell-field";
import { PageTransition } from "@/components/site/page-transition";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { getPublicRecap } from "@/server/recaps";
import { StoryPlayer } from "../../recap/story-player";

export async function generateMetadata({ params }: PageProps<"/u/[login]">): Promise<Metadata> {
  const { login } = await params;
  const recap = (await getPublicRecap(login))?.data;
  if (!recap) return { title: "Recap not found", robots: { index: false } };
  const title = `@${recap.profile.login}'s ${recap.meta.year} on GitHub`;
  const description = `${recap.contributions.total.toLocaleString("en-US")} contributions, a ${recap.contributions.longestStreak.days}-day streak${recap.identity.archetype ? `, ${ARCHETYPE_LABELS[recap.identity.archetype]}` : ""}.`;
  return {
    title,
    description,
    alternates: { canonical: `/u/${recap.profile.login}` },
    openGraph: { title, description },
    twitter: { card: "summary_large_image" },
  };
}

/** A shared recap. Only the public projection reaches this page (getPublicRecap). */
export default function PublicRecapPage({ params }: PageProps<"/u/[login]">) {
  return (
    <>
      <SiteHeader base="/" />
      <PageTransition>
        <main id="main" className="flex flex-1 flex-col">
          <Suspense
            fallback={
              <div>
                <LoadingCell label="Loading this recap…" />
              </div>
            }
          >
            <PublicRecap params={params} />
          </Suspense>
          <ClosingSection
            action={
              <a href="/" className={button.primary}>
                Make your own recap
              </a>
            }
          />
        </main>
        <SiteFooter base="/" />
      </PageTransition>
    </>
  );
}

async function PublicRecap({ params }: { params: PageProps<"/u/[login]">["params"] }) {
  const { login } = await params;
  const shared = await getPublicRecap(login);
  if (!shared) notFound();
  return <Summary data={shared.data} />;
}

function Summary({ data }: { data: RecapData }) {
  const { contributions, languages, identity, profile, meta } = data;
  const facts = [
    { term: "Active days", value: contributions.activeDays.toLocaleString("en-US") },
    { term: "Longest streak", value: `${contributions.longestStreak.days} days` },
    { term: "Top language", value: languages.top[0]?.name ?? "Not enough data" },
  ];
  return (
    <>
      <section aria-labelledby="recap-title" className="overflow-hidden border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-12 pb-10 sm:px-8 sm:pt-16">
          <p className="text-lg font-bold">
            @{profile.login} · {meta.isFinal ? meta.year : `${meta.year} so far`}
          </p>
          <h1
            id="recap-title"
            className="mt-2 text-7xl leading-[0.9] font-extrabold tracking-tight tabular-nums sm:text-[10rem]"
          >
            {contributions.total.toLocaleString("en-US")}
            <span className="block text-3xl tracking-normal text-green sm:text-4xl">
              contributions
            </span>
          </h1>
          <dl className="mt-10 grid max-w-3xl gap-x-10 gap-y-6 sm:grid-cols-3">
            {facts.map(({ term, value }) => (
              <div key={term} className="border-t-2 border-paper/30 pt-3">
                <dt className="text-base font-bold">{term}</dt>
                <dd className="mt-1 text-3xl font-extrabold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {/* Their actual year, day by day: the owner's own graph is the illustration. */}
        <CellField
          levels={calendarLevels(contributions.calendar)}
          className="block h-28 w-full sm:h-40"
        />
      </section>

      <section
        aria-labelledby="archetype-title"
        className="relative overflow-hidden border-b border-line bg-[#010409] px-4 py-16 sm:px-8 sm:py-24"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-lg font-bold">
              @{profile.login}'s {meta.year} archetype
            </p>
            <h2
              id="archetype-title"
              className="mt-2 text-6xl leading-[0.92] font-extrabold tracking-tight sm:text-8xl"
            >
              {identity.archetype ? ARCHETYPE_LABELS[identity.archetype] : NO_ARCHETYPE}
            </h2>
            {identity.reasons.length > 0 && (
              <ul className="mt-8 space-y-2 text-lg">
                {identity.reasons.map((reason) => (
                  <li key={reason} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-3 shrink-0 rounded-[2px] bg-green" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Image
            src={`/art/cutout-${identity.archetype ?? "cell-sleep"}.png`}
            alt=""
            width={1200}
            height={900}
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="h-auto w-full origin-center scale-110"
          />
        </div>
      </section>

      <section aria-labelledby="story-title" className="px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[1fr_minmax(0,30rem)]">
          <div className="lg:sticky lg:top-24">
            <h2
              id="story-title"
              className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl"
            >
              Watch the whole story.
            </h2>
            <p className="mt-6 max-w-xl text-lg sm:text-xl">
              Nine chapters about @{profile.login}'s year, with the soundtrack. Press play, and turn
              the sound on if you like.
            </p>
            <p className="mt-6 max-w-xl text-base">
              Shared by its owner. WrapYourGit shows counts only and never names private
              repositories.
            </p>
          </div>
          <StoryPlayer data={data} />
        </div>
      </section>
    </>
  );
}
