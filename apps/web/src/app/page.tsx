import { EDITION_YEAR } from "@wyg/schema";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Art } from "@/components/art";
import {
  ArchetypesSection,
  ClosingSection,
  FAQ,
  FaqSection,
  KeepSection,
  LetterSection,
  PrivacySection,
  StorySection,
} from "@/components/landing/sections";
import { CellField, demoLevels } from "@/components/site/cell-field";
import { PageTransition } from "@/components/site/page-transition";
import { SiteFooter } from "@/components/site/site-footer";
import { SignInButton, SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { UsernameForm } from "@/components/username-form";
import { getCurrentUser } from "@/server/auth";
import { recapPath } from "@/server/routes";
import { OPEN_GRAPH, SITE, siteUrl } from "@/site";

const NOTICES: Record<string, string> = {
  "signin=cancelled": "Sign-in was cancelled on GitHub. Nothing was saved.",
  "signin=expired": "That sign-in link expired. Start again below.",
  "signin=failed": "GitHub sign-in didn't finish. Try again in a moment.",
  "deleted=1": "Your data is deleted and WrapYourGit's access to GitHub is revoked.",
  "deleted=unrevoked":
    "Your data is deleted. To finish, revoke WrapYourGit in your GitHub settings under Applications.",
};

const HERO_CELLS = demoLevels(53);

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH, url: "/" },
};

/**
 * Structured data: the site, the free web app it is, and the FAQ shown on the page (taken from
 * the same array, so the two never disagree). One @graph so the nodes can reference each other.
 */
function structuredData() {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "en",
        publisher: { "@id": `${url}/#author` },
      },
      {
        "@type": "Person",
        "@id": `${url}/#author`,
        name: SITE.author.name,
        alternateName: SITE.author.handle,
        url: SITE.author.url,
        sameAs: [SITE.author.github],
      },
      {
        "@type": "WebApplication",
        "@id": `${url}/#app`,
        name: SITE.name,
        url,
        description: SITE.description,
        image: `${url}/opengraph-image`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires a modern web browser",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": `${url}/#author` },
        featureList: [
          `Your ${EDITION_YEAR} GitHub contributions, active days and longest streak`,
          "Languages weighted by what you actually committed",
          "Top repositories, stars and forks gained this year",
          "Pull requests, reviews and issues",
          "A developer archetype with the facts behind it",
          "Comparison with the same span of last year",
          "Slides as PNG, a PDF and a public page for every GitHub username",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        mainEntity: FAQ.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON we build from our own constants, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
      />
      <SiteHeader />
      <PageTransition>
        <main id="main" className="flex flex-1 flex-col">
          {/* 90svh, not vh: on phones vh counts the space behind the address bar, which hides the graph. */}
          <section
            aria-labelledby="hero-title"
            className="relative flex min-h-[90svh] flex-col overflow-hidden bg-linear-to-b from-canvas to-surface"
          >
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-8">
              <Suspense fallback={null}>
                <Notice searchParams={searchParams} />
              </Suspense>
              <div className="grid flex-1 items-center gap-10 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1fr_1.05fr]">
                <div>
                  <h1
                    id="hero-title"
                    className="text-5xl leading-[1.02] font-bold tracking-tight text-balance sm:text-7xl"
                  >
                    Every green square has a story.{" "}
                    <span className="text-green">Here's yours, in motion.</span>
                  </h1>
                  <p className="mt-8 max-w-xl text-lg text-muted sm:text-xl">
                    Type a GitHub username and watch that developer's {EDITION_YEAR} play back as a
                    short animated story: their contributions, their rhythm, the languages they
                    lived in and the kind of developer they turned out to be. Sign in for your own,
                    with private contributions counted.
                  </p>
                  <div className="mt-10">
                    <Suspense fallback={<HeroForm />}>
                      <HeroFormWithError searchParams={searchParams} />
                    </Suspense>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Suspense fallback={<SignInButton variant="secondary" />}>
                      <PrimaryAction variant="secondary" />
                    </Suspense>
                    <a href="#story" className={button.quiet}>
                      See the city
                    </a>
                  </div>
                </div>
                <div>
                  <Art
                    id="hero-cast"
                    alt="Cell, the WrapYourGit mascot, waving in front of snapshots of a workshop, fireworks and mountains"
                    priority
                    className="h-auto w-full motion-safe:animate-[rise_900ms_ease-out_both]"
                  />
                </div>
              </div>
            </div>
            {/* A year of cells along the bottom of the hero: the motif the whole product is built on. */}
            <CellField levels={HERO_CELLS} className="block h-24 w-full sm:h-32 -mb-15" />
          </section>

          <StorySection />
          <ArchetypesSection />
          <LetterSection />
          <KeepSection />
          <PrivacySection />
          <FaqSection />
          <ClosingSection
            action={
              <Suspense fallback={<SignInButton />}>
                <PrimaryAction />
              </Suspense>
            }
          />
        </main>
        <SiteFooter />
      </PageTransition>
    </>
  );
}

async function PrimaryAction({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const user = await getCurrentUser();
  if (!user) return <SignInButton variant={variant} />;
  return (
    <Link
      href={recapPath(user.login)}
      transitionTypes={["nav-forward"]}
      className={`${button[variant]} max-w-full wrap-anywhere`}
    >
      Open your {EDITION_YEAR} recap, @{user.login}
    </Link>
  );
}

const INVALID_USERNAME =
  "That isn't a GitHub username. Use letters, numbers and hyphens, 39 at most, with no hyphen at either end.";

function HeroForm({ error }: { error?: string }) {
  return <UsernameForm id="hero-username" submit="Play their year" error={error} />;
}

/** /go sends a name GitHub couldn't issue back here as ?u=invalid; the field says why. */
async function HeroFormWithError({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const { u } = await searchParams;
  return <HeroForm error={u === "invalid" ? INVALID_USERNAME : undefined} />;
}

async function Notice({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const key = Object.entries(params)
    .map(([name, value]) => `${name}=${value}`)
    .find((entry) => entry in NOTICES);
  if (!key) return null;
  return (
    <p
      role="status"
      className="mt-6 max-w-xl rounded-md border border-[#1f6feb66] bg-[#388bfd1a] px-4 py-3"
    >
      {NOTICES[key]}
    </p>
  );
}
