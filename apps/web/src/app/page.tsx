import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArchetypesSection,
  ClosingSection,
  FaqSection,
  KeepSection,
  LetterSection,
  PrivacySection,
  StorySection,
} from "@/components/landing/sections";
import { Scene3D } from "@/components/scene3d/scene-3d";
import { CellField, demoLevels } from "@/components/site/cell-field";
import { SiteFooter } from "@/components/site/site-footer";
import { SignInButton, SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";

const NOTICES: Record<string, string> = {
  "signin=cancelled": "Sign-in was cancelled on GitHub. Nothing was saved.",
  "signin=expired": "That sign-in link expired. Start again below.",
  "signin=failed": "GitHub sign-in didn't finish. Try again in a moment.",
  "deleted=1": "Your data is deleted and WrapYourGit's access to GitHub is revoked.",
  "deleted=unrevoked":
    "Your data is deleted. To finish, revoke WrapYourGit in your GitHub settings under Applications.",
};

const HERO_CELLS = demoLevels(53);

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <section
          aria-labelledby="hero-title"
          className="on-dark relative overflow-hidden bg-ink text-paper"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <Suspense fallback={null}>
              <Notice searchParams={searchParams} />
            </Suspense>
            <div className="grid items-center gap-10 pt-12 pb-10 sm:pt-16 lg:grid-cols-[1fr_1.05fr]">
              <div>
                <h1
                  id="hero-title"
                  className="text-6xl leading-[0.92] font-extrabold tracking-tight sm:text-8xl"
                >
                  Your year in code.
                  <span className="block text-cell">Your story in motion.</span>
                </h1>
                <p className="mt-8 max-w-xl text-lg sm:text-xl">
                  Sign in with GitHub and watch your {EDITION_YEAR} play back as a short animated
                  story: your contributions, your rhythm, the languages you lived in and the kind of
                  developer you turned out to be.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Suspense fallback={<SignInButton />}>
                    <PrimaryAction />
                  </Suspense>
                  <a href="#story" className={button.quiet}>
                    See the nine chapters
                  </a>
                </div>
              </div>
              <Scene3D
                art="hero"
                priority
                alt="Cell, the WrapYourGit mascot, in a hard hat in front of a 3D contribution graph"
              />
            </div>
          </div>
          {/* A year of cells along the bottom of the hero: the motif the whole product is built on. */}
          <CellField levels={HERO_CELLS} className="block h-24 w-full sm:h-32" />
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
    </>
  );
}

async function PrimaryAction() {
  const user = await getCurrentUser();
  if (!user) return <SignInButton />;
  return (
    <Link href="/dashboard" className={button.primary}>
      Open your {EDITION_YEAR} recap, @{user.login}
    </Link>
  );
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
      className="mt-6 max-w-xl rounded-[var(--radius-control)] bg-paper px-4 py-3 text-ink"
    >
      {NOTICES[key]}
    </p>
  );
}
