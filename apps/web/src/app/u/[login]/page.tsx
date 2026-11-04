import type { RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "@wyg/video/copy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { button } from "@/components/ui";
import { getPublicRecap } from "@/server/recaps";
import { StoryPlayer } from "../../recap/story-player";

export async function generateMetadata({ params }: PageProps<"/u/[login]">): Promise<Metadata> {
  const { login } = await params;
  const recap = (await getPublicRecap(login))?.data;
  if (!recap) return { title: "Recap not found · WrapYourGit" };
  const title = `@${recap.profile.login}'s ${recap.meta.year} in code · WrapYourGit`;
  const description = `${recap.contributions.total.toLocaleString("en-US")} contributions, a ${recap.contributions.longestStreak.days}-day streak${recap.identity.archetype ? `, ${ARCHETYPE_LABELS[recap.identity.archetype]}` : ""}.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image" },
  };
}

/** A shared recap. Only the public projection reaches this page (getPublicRecap). */
export default function PublicRecapPage({ params }: PageProps<"/u/[login]">) {
  return (
    <>
      <header className="on-dark bg-ink px-4 pt-8 text-paper sm:px-10">
        <p className="text-lg font-extrabold">WrapYourGit</p>
      </header>
      <main className="on-dark flex flex-1 flex-col bg-ink px-4 pb-14 text-paper sm:px-10">
        <Suspense
          fallback={
            <p role="status" className="py-20 text-lg">
              Loading this recap…
            </p>
          }
        >
          <PublicRecap params={params} />
        </Suspense>
      </main>
      <footer className="px-4 py-6 text-base sm:px-10">
        Shared by its owner. WrapYourGit shows counts only and never names private repositories.
      </footer>
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
  return (
    <div className="grid gap-12 pt-10 lg:grid-cols-[1fr_minmax(0,28rem)]">
      <div>
        <p className="text-lg font-bold">
          @{profile.login} · {meta.isFinal ? meta.year : `${meta.year} so far`}
        </p>
        <h1 className="mt-2 text-7xl leading-[0.9] font-extrabold tracking-tight tabular-nums sm:text-9xl">
          {contributions.total.toLocaleString("en-US")}
        </h1>
        <p className="mt-2 text-xl font-bold">contributions</p>
        <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-8 gap-y-6 text-lg">
          <div>
            <dt>Active days</dt>
            <dd className="text-3xl font-extrabold tabular-nums">{contributions.activeDays}</dd>
          </div>
          <div>
            <dt>Longest streak</dt>
            <dd className="text-3xl font-extrabold tabular-nums">
              {contributions.longestStreak.days} days
            </dd>
          </div>
          <div>
            <dt>Top language</dt>
            <dd className="text-3xl font-extrabold">
              {languages.top[0]?.name ?? "Not enough data"}
            </dd>
          </div>
          <div>
            <dt>Archetype</dt>
            <dd className="text-3xl font-extrabold text-persimmon">
              {identity.archetype ? ARCHETYPE_LABELS[identity.archetype] : NO_ARCHETYPE}
            </dd>
          </div>
        </dl>
        <a href="/" className={`${button.primary} mt-10`}>
          Make your own {meta.year} recap
        </a>
      </div>
      <div>
        <h2 className="sr-only">The story</h2>
        <StoryPlayer data={data} />
      </div>
    </div>
  );
}
