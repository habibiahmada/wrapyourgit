import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/site/legal-page";
import { OPEN_GRAPH, SITE } from "@/site";

const TITLE = "Terms of use";
const DESCRIPTION =
  "WrapYourGit is a free side project, provided as is and not affiliated with GitHub. What you can expect from it, and what it expects from you.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    ...OPEN_GRAPH,
    url: "/terms",
    title: `${TITLE} · WrapYourGit`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · WrapYourGit`,
    description: DESCRIPTION,
  },
};

const UPDATED = "13 November 2026";

/*
 * Plain words, and only promises the code keeps: the lookup limit and the human check
 * (server/public-policy.ts, server/human-check.ts), hiding a public recap and deleting your data
 * (Settings), the licences (LICENSE, packages/video/public/audio/LICENSES.md). Change this page in
 * the same change that changes the behaviour.
 */

const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    title: "The short version",
    body: (
      <p>
        WrapYourGit is a free side project made by one person, @{SITE.author.handle}. It turns a
        year of GitHub activity into a story you can watch and download. It is provided as is, it
        may change or stop, and it is not made, endorsed or run by GitHub. Use it fairly and it is
        yours to enjoy.
      </p>
    ),
  },
  {
    id: "who",
    title: "Who runs it",
    body: (
      <p>
        A single developer, not a company, as a hobby. There is no paid plan and no advertising. To
        report a problem or ask a question, open an issue on{" "}
        <a href={SITE.repository}>the project's repository</a>. For a security problem, follow the
        repository's security policy instead of opening a public issue.
      </p>
    ),
  },
  {
    id: "using",
    title: "Using WrapYourGit",
    body: (
      <>
        <p>
          By using the site you agree to these terms. You also stay bound by GitHub's own terms.
        </p>
        <ul>
          <li>Sign in only with GitHub accounts you control.</li>
          <li>
            Open recaps by hand. Do not script, scrape or mass-request them, and do not try to get
            around the lookup limit or the check that you are a person.
          </li>
          <li>
            Do not attack, overload or probe the site, and do not use it to break the law or anyone
            else's rights.
          </li>
        </ul>
        <p>
          We may block an account or an address that does any of this, without warning, to keep the
          site working for everyone else.
        </p>
      </>
    ),
  },
  {
    id: "public",
    title: "Public recaps",
    body: (
      <>
        <p>
          Anyone can open a recap of any GitHub username. It is built from public activity only, the
          same activity a GitHub profile shows, as the{" "}
          <Link href="/privacy#public">privacy policy</Link> explains.
        </p>
        <ul>
          <li>
            Do not use someone else's recap to harass, embarrass or misrepresent them, or pass it
            off as your own.
          </li>
          <li>
            If it is your account and you would rather it were not shown, turn on Hide my public
            recap in Settings. It comes down immediately.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "files",
    title: "Your files and the project's",
    body: (
      <>
        <p>
          The videos, slides, PDFs and share cards you make are yours to keep and post wherever you
          like. They show your own numbers, so check what they say before you share them.
        </p>
        <p>
          The source code is open under the MIT License, and the music and sound effects are
          released under CC0. Both are in <a href={SITE.repository}>the repository</a>, with the
          licence of every part.
        </p>
      </>
    ),
  },
  {
    id: "accuracy",
    title: "About the numbers",
    body: (
      <p>
        Every number comes from GitHub's API and is computed as described in the project's metric
        definitions. GitHub may count, delay or withhold some activity differently from what you
        expect, and a value worked out from partial data is labelled as an estimate. The recap is
        for fun and reflection, not a record to rely on for hiring, pay or anything else that
        matters.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability",
    body: (
      <p>
        The site is free and runs on a hobby budget. It may be slow, unavailable, changed or shut
        down at any time, and each edition covers one year. Download the files you want to keep.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "No warranty",
    body: (
      <p>
        WrapYourGit is provided as is, without any warranty. To the extent the law allows, its maker
        is not liable for any loss or damage that comes from using it or from not being able to use
        it.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Leaving",
    body: (
      <p>
        You can stop at any time. Delete my data in Settings removes your account, recap, tokens and
        sessions and revokes the site's access to GitHub. You can also revoke that access on GitHub,
        under Settings, Applications.
      </p>
    ),
  },
  {
    id: "trademarks",
    title: "Trademarks",
    body: (
      <p>
        GitHub and the GitHub logo are trademarks of GitHub, Inc. WrapYourGit uses GitHub's API and
        names GitHub to say where the data comes from, and is not affiliated with or endorsed by
        GitHub.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        If these terms change, this page changes first, with a new date at the top. Using the site
        after that means you accept the new version.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      lead="A free side project, made for fun. Here is what you can expect from it, and what it asks of you."
      updated={UPDATED}
      art="skin-builder"
      sections={SECTIONS}
    />
  );
}
