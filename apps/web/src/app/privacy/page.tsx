import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Art } from "@/components/art";
import { PageTransition } from "@/components/site/page-transition";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { OPEN_GRAPH } from "@/site";

const TITLE = "Privacy policy";
const DESCRIPTION =
  "What WrapYourGit reads from GitHub, what it stores, what goes public and how to delete it all.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    ...OPEN_GRAPH,
    url: "/privacy",
    title: `${TITLE} · WrapYourGit`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · WrapYourGit`,
    description: DESCRIPTION,
  },
};

const UPDATED = "4 November 2026";

/*
 * Every statement here describes what the code does today (server/auth.ts, server/recaps.ts,
 * analytics/public.ts). Change this page in the same change that changes the behaviour.
 */

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "summary",
    title: "The short version",
    body: (
      <>
        <p>
          WrapYourGit reads activity counts from GitHub to build your yearly recap. It never reads
          your code, stores only what the recap needs, shares nothing unless you publish it, and
          deletes everything when you ask.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <ul>
        <li>
          <strong>Your GitHub identity</strong>: numeric account id, login, display name and avatar
          URL, so we know whose recap is whose.
        </li>
        <li>
          <strong>GitHub access tokens</strong>: issued when you sign in, encrypted at rest with
          AES-256-GCM and used only on our server. They are never sent to your browser.
        </li>
        <li>
          <strong>Your recap</strong>: counts computed from your GitHub activity for the year, such
          as contributions per day, languages, the repositories you committed to, pull requests,
          issues, reviews and stars. Private repositories appear as counts, and their names are kept
          out of anything shareable.
        </li>
        <li>
          <strong>Repository metadata, only if you choose</strong>: if you install WrapYourGit on
          your account or an organisation to count private repositories you own, it reads the
          metadata of the repositories you select (name, visibility, language, stars). Never their
          code. Private names still never appear in anything shareable.
        </li>
        <li>
          <strong>Your timezone</strong>: the one your browser reports when you sync, so the recap's
          dates and hours match your day.
        </li>
        <li>
          <strong>A session</strong>: we store a SHA-256 hash of your session token, never the token
          itself.
        </li>
      </ul>
    ),
  },
  {
    id: "never",
    title: "What we never collect",
    body: (
      <ul>
        <li>
          Source code. Signing in asks GitHub for no repository permissions, and the optional
          installation asks for metadata only.
        </li>
        <li>Your email address, your followers or anything outside your year's activity.</li>
        <li>Analytics, advertising or tracking data. The site loads no third-party trackers.</li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <p>
        Only to build, show and export your recap: the story, the letter, the PNG and PDF slides,
        and the public page if you publish one. We do not sell or rent your data and do not use it
        to train models.
      </p>
    ),
  },
  {
    id: "public",
    title: "What goes public",
    body: (
      <>
        <p>
          Nothing, until you publish your recap from the dashboard. A published recap at
          /u/your-login shows a reduced copy:
        </p>
        <ul>
          <li>Private repository names and details are removed.</li>
          <li>Your timezone is replaced with UTC.</li>
          <li>The hours of the day you commit are withheld.</li>
        </ul>
        <p>Unpublishing takes the page down immediately.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <ul>
        <li>
          <strong>wyg_session</strong>: keeps you signed in for up to 30 days. HttpOnly, sent only
          to this site.
        </li>
        <li>
          <strong>wyg_oauth</strong>: protects the GitHub sign-in against forgery. It lasts 10
          minutes and is removed after sign-in.
        </li>
      </ul>
    ),
  },
  {
    id: "third-parties",
    title: "Who else is involved",
    body: (
      <p>
        GitHub, whose API we read your activity from under its own privacy statement. The service
        runs on cloud infrastructure; the hosting and database providers will be named here before
        the public launch.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul>
        <li>Your recap and tokens: until you delete your data.</li>
        <li>Sessions: 30 days, or until you sign out.</li>
        <li>Server logs: error summaries only, without tokens or recap content.</li>
      </ul>
    ),
  },
  {
    id: "choices",
    title: "Your choices",
    body: (
      <ul>
        <li>
          <strong>Delete my data</strong> in Settings removes your account, recap, tokens and
          sessions, and revokes WrapYourGit's access to GitHub.
        </li>
        <li>You can also revoke access at any time on GitHub, under Settings, Applications.</li>
        <li>Unpublish your public recap from the dashboard whenever you like.</li>
      </ul>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        If what we collect or how we use it changes, this page changes first, with a new date at the
        top.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader base="/" />
      <PageTransition>
        <main id="main" className="flex flex-1 flex-col">
          <section className="relative overflow-hidden border-b border-line">
            <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-14 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <h1 className="reveal text-6xl leading-[0.92] font-extrabold tracking-tight sm:text-8xl">
                  Privacy policy
                </h1>
                <p className="mt-6 max-w-xl text-lg sm:text-xl">
                  Read-only, and yours to delete. Here is exactly what that means.
                </p>
                <p className="mt-4 text-base">Last updated {UPDATED}</p>
              </div>
              <Art id="skin-night-owl" alt="" priority className="h-auto w-full" />
            </div>
          </section>
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[16rem_1fr]">
            <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
              <ul className="space-y-1">
                {SECTIONS.map(({ id, title }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
                    >
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <article className="max-w-3xl">
              {SECTIONS.map(({ id, title, body }) => (
                <section
                  key={id}
                  id={id}
                  aria-labelledby={`${id}-title`}
                  className="border-t border-line py-8 text-lg text-muted [&_strong]:text-fg [&_li]:mt-2 [&_p+p]:mt-4 [&_p+ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul+p]:mt-4"
                >
                  <h2 id={`${id}-title`} className="text-2xl font-bold text-fg">
                    {title}
                  </h2>
                  <div className="mt-4">{body}</div>
                </section>
              ))}
            </article>
          </div>
        </main>
        <SiteFooter base="/" />
      </PageTransition>
    </>
  );
}
