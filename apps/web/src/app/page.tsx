import { EDITION_YEAR } from "@wyg/schema";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HeroArt } from "@/components/landing/hero-art";
import {
  ArchetypesSection,
  ClosingSection,
  FAQ,
  FaqSection,
  JourneySection,
  LetterSection,
  MetricsSection,
  PlayerSection,
  PrintsSection,
  PrivacySection,
  ReelSection,
} from "@/components/landing/sections";
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
        alternateName: [...SITE.alternateNames],
        description: SITE.description,
        keywords: SITE.keywords.join(", "),
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
        alternateName: [...SITE.alternateNames],
        url,
        keywords: SITE.keywords.join(", "),
        sameAs: [SITE.repository],
        description: SITE.description,
        image: `${url}/opengraph-image`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires a modern web browser",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": `${url}/#author` },
        isBasedOn: { "@id": `${url}/#source` },
        featureList: [
          `Your ${EDITION_YEAR} GitHub contributions, active days and longest streak`,
          "Languages weighted by what you actually committed",
          "Top repositories, stars and forks gained this year",
          "Pull requests, reviews and issues",
          "A developer archetype with the facts behind it",
          "Comparison with the same span of last year",
          "An MP4 video, slides as PNG and a PDF in four shapes, and a share card",
          "A public page for every GitHub username",
        ],
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${url}/#source`,
        name: SITE.name,
        codeRepository: SITE.repository,
        programmingLanguage: "TypeScript",
        license: "https://opensource.org/licenses/MIT",
        author: { "@id": `${url}/#author` },
        copyrightHolder: { "@id": `${url}/#author` },
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
          {/* 90svh, not vh: on phones vh counts the space behind the address bar. */}
          <section
            aria-labelledby="hero-title"
            className="relative flex min-h-[90svh] flex-col overflow-hidden bg-canvas"
          >
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-8">
              <Suspense fallback={null}>
                <Notice searchParams={searchParams} />
              </Suspense>
              <div className="grid flex-1 items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <h1
                    id="hero-title"
                    className="max-w-xl text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl"
                  >
                    Every <span className="text-green">green square</span> has a story.
                  </h1>
                  <p className="mt-6 max-w-md text-lg text-muted">
                    Your GitHub Wrapped for {EDITION_YEAR}. Type your GitHub username and watch the
                    year play back as a short animated story. Sign in to include your private work.
                  </p>
                  <div className="mt-8">
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
                {/* A quarter of a year as a city, linked to what the story does with it. */}
                <HeroArt className="min-w-0" />
              </div>
            </div>
          </section>

          <JourneySection />
          <ReelSection />
          <MetricsSection />
          <ArchetypesSection />
          <LetterSection />
          <PlayerSection />
          <PrintsSection />
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
      Open your recap
    </Link>
  );
}

const INVALID_USERNAME =
  "That isn't a GitHub username. Use letters, numbers and hyphens, 39 at most, with no hyphen at either end.";

function HeroForm({ error }: { error?: string }) {
  return <UsernameForm id="hero-username" submit="Play your year" error={error} />;
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
