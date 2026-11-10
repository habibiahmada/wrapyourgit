import type { RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "@wyg/video/copy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Art } from "@/components/art";
import { ClosingSection } from "@/components/landing/sections";
import { LoadingCell } from "@/components/loading-cell";
import { PageTransition } from "@/components/site/page-transition";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { getPublicRecap } from "@/server/recaps";
import { OPEN_GRAPH } from "@/site";
import { HiddenWhilePlaying, PublicPlayback, PublicStory } from "./public-story";

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
    openGraph: {
      ...OPEN_GRAPH,
      type: "profile",
      url: `/u/${recap.profile.login}`,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * A shared recap: a card that plays the story world, then the archetype. Only the public
 * projection reaches this page (getPublicRecap), and the player projects it again.
 */
export default function PublicRecapPage({ params }: PageProps<"/u/[login]">) {
  return (
    <PublicPlayback>
      <HiddenWhilePlaying>
        <SiteHeader base="/" />
      </HiddenWhilePlaying>
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
          <HiddenWhilePlaying>
            <ClosingSection
              action={
                <a href="/" className={button.primary}>
                  Make your own recap
                </a>
              }
            />
          </HiddenWhilePlaying>
        </main>
        <HiddenWhilePlaying>
          <SiteFooter base="/" />
        </HiddenWhilePlaying>
      </PageTransition>
    </PublicPlayback>
  );
}

async function PublicRecap({ params }: { params: PageProps<"/u/[login]">["params"] }) {
  const { login } = await params;
  const shared = await getPublicRecap(login);
  if (!shared) notFound();
  return (
    <>
      <PublicStory data={shared.data} />
      <HiddenWhilePlaying>
        <Archetype data={shared.data} />
      </HiddenWhilePlaying>
    </>
  );
}

function Archetype({ data }: { data: RecapData }) {
  const { identity, profile, meta } = data;
  return (
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
        <Art
          id={`cutout-${identity.archetype ?? "cell-sleep"}`}
          alt=""
          className="h-auto w-full origin-center scale-110"
        />
      </div>
    </section>
  );
}
