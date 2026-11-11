import { type ArchetypeId, EDITION_YEAR } from "@wyg/schema";
import { ARCHETYPE_LABELS, STOP_TITLES } from "@wyg/video/copy";
import { OPENINGS } from "@wyg/video/letter";
import Image from "next/image";
import type { ReactNode } from "react";
import { Art } from "@/components/art";
import { CellField, demoLevels } from "@/components/site/cell-field";
import { FrameReel } from "./frame-reel";

/*
 * Landing sections in the GitHub-dark style (DESIGN.md): dark canvas, surface boxes with hairline
 * borders, GitHub's contribution greens as the one accent. Every fact comes from the product
 * itself: the stops from the story world's copy, archetype rules from metrics.md, letter lines
 * from letter.ts. No invented numbers or quotes (R-17, R-38).
 */

const box = "rounded-xl border border-line bg-surface";
const heading = "text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl";
const lead = "max-w-xl text-lg text-muted sm:text-xl";

/** The world's stops in story order: the object keeps STOP_TITLES' declaration order. */
const STOPS = Object.entries(STOP_TITLES);

/** Frames from the public sample (scripts/world-stills.ts --fixture public-sample, 4:5). */
const FRAMES = [
  {
    file: "hello",
    alt: "Hello: Cell's head says hi to @octo-sample and asks, ready for your 2026?",
  },
  {
    file: "city",
    alt: "Your year as a city: 1,284 contributions, one green building per day",
  },
  {
    file: "busiest",
    alt: "Your busiest day: one tall building under a sign, Saturday, Jan 3, 8 contributions",
  },
  {
    file: "rhythm",
    alt: "Your rhythm: contribution cells piled on a train, one wagon per weekday, Tuesday carried the most",
  },
  {
    file: "languages",
    alt: "Languages: one tree per language, TypeScript 42%, JavaScript 28%, Python 18%",
  },
  {
    file: "projects",
    alt: "Projects: crates on shelves, one crate for about 50 commits, a private repository unnamed",
  },
  {
    file: "community",
    alt: "Community: a star for 128 stars earned and a signpost for 12 forks, in the night sky",
  },
  {
    file: "archetype",
    alt: "Your archetype: Builder, Cell in a hard hat under a spotlight, with the reasons",
  },
  {
    file: "closing",
    alt: "The year in one frame: the total, active days and archetype over fireworks",
  },
] as const;

export function StorySection() {
  return (
    <section id="story" aria-labelledby="story-title" className="overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <h2 id="story-title" className={`reveal-left ${heading}`}>
            Your year as a city, one stop at a time.
          </h2>
          <p className={`reveal-right ${lead}`}>
            Every day of your year becomes a building. The camera flies from stop to stop and waits
            for your tap, and every number on screen comes from your GitHub year with a written
            definition behind it.
          </p>
        </div>

        {/* The real running order of the stops. */}
        <ol
          aria-label="Stops in order"
          className="reveal mt-14 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7"
        >
          {STOPS.map(([kind, title], i) => (
            <li
              key={kind}
              className="flex min-h-12 items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 lg:min-h-24 lg:flex-col lg:items-start lg:justify-end"
            >
              <span className="text-xs font-semibold text-muted tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-semibold leading-tight">{title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          {STOPS.length} stops, the letter sometimes over a few pages, then your downloads.
        </p>
      </div>

      <div className="reveal mt-12">
        <FrameReel
          frames={FRAMES.map((frame) => ({
            ...frame,
            label: `${String(STOPS.findIndex(([kind]) => kind === frame.file) + 1).padStart(2, "0")} ${STOP_TITLES[frame.file]}`,
          }))}
        />
      </div>
      <p className="mx-auto mt-10 max-w-7xl px-4 text-sm text-muted sm:px-8">
        Frames from a recap built on sample data, not a real account.
      </p>
    </section>
  );
}

const ARCHETYPES: { id: ArchetypeId; wears: string; rule: string }[] = [
  {
    id: "builder",
    wears: "orange, in a hard hat, hammering in the workshop",
    rule: "You created at least two repositories, or made 50 or more commits to your own.",
  },
  {
    id: "consistent",
    wears: "green, in a sweatband, running laps on the track",
    rule: "You were active on at least 30% of the days so far.",
  },
  {
    id: "explorer",
    wears: "sky blue, cap and backpack, waving from the mountains",
    rule: "You wrote in four or more languages.",
  },
  {
    id: "collaborator",
    wears: "pink, in a headset, handing work on over a shared map",
    rule: "You left ten or more reviews, or opened ten or more pull requests on other people's repositories.",
  },
  {
    id: "night-owl",
    wears: "lavender, owl tufts and glasses, grooving over the city at night",
    rule: "At least 40% of your sampled commits landed between 22:00 and 04:00. Estimated, and labelled as such.",
  },
  {
    id: "open-sourcer",
    wears: "teal, in a scarf, cheering by a community mural",
    rule: "You contributed to three or more public repositories you don't own.",
  },
];

export function ArchetypesSection() {
  return (
    <section
      id="archetypes"
      aria-labelledby="archetypes-title"
      className="overflow-hidden border-y border-line bg-[#010409] px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 id="archetypes-title" className={`reveal-left ${heading}`}>
            What kind of developer were you?
          </h2>
          <p className={`reveal mt-6 max-w-2xl ${lead}`}>
            The climax of the story names your archetype, with the facts that earned it. Each one
            comes with its own Cell: its colour, its pose, its place. You get one, plus up to two
            runner-ups you came close to. If none fits yet, the story says so honestly.
          </p>
        </div>
        <ul className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {ARCHETYPES.map(({ id, wears, rule }) => (
            <li key={id} className={`reveal-zoom overflow-hidden ${box} hover:border-muted`}>
              <div className="border-b border-line bg-canvas px-4 pt-4">
                <Art
                  id={`skin-${id}`}
                  alt={`Cell as the ${ARCHETYPE_LABELS[id]}: ${wears}`}
                  className="h-auto w-full"
                />
              </div>
              <div className="p-5">
                <h3 className="text-2xl font-bold">{ARCHETYPE_LABELS[id]}</h3>
                <p className="text-sm text-muted">{wears}</p>
                <p className="mt-3 text-base text-muted">{rule}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LetterSection() {
  const quiet = OPENINGS.quiet[1];
  const relentless = OPENINGS.relentless[0];
  return (
    <section aria-labelledby="letter-title" className="overflow-hidden px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <div className="reveal-left">
          <h2 id="letter-title" className={heading}>
            Then Cell writes you a letter.
          </h2>
          <p className={`mt-6 ${lead}`}>
            Near the end of the story comes a letter from Cell, our mascot. It reads your year the
            way a friend would: fewer numbers, more of what they meant. A quiet year is told it
            counts. A relentless one is told to rest.
          </p>
        </div>
        <div className="reveal-right relative flex flex-col gap-5 lg:pl-40">
          {/* Cell stands beside its letters, unframed. The PNG has room around the character,
              so negative margins pull it close to the first comment. */}
          <Art
            id="cutout-cell-wave"
            alt=""
            className="pointer-events-none mx-auto -mt-16 -mb-24 h-auto w-[22rem] lg:absolute lg:top-1/2 lg:-left-44 lg:m-0 lg:w-[30rem] lg:-translate-y-[58%] motion-safe:animate-[bob_2.4s_ease-in-out_infinite]"
          />
          <Comment label="for a quiet year">{quiet}</Comment>
          <Comment label="for a year that barely stopped" className="sm:ml-12">
            {relentless}
          </Comment>
        </div>
      </div>
    </section>
  );
}

/** A letter excerpt shown the way GitHub shows a comment: header bar, then the body. */
function Comment({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={`relative max-w-xl ${className}`}>
      <div className={`min-w-0 overflow-hidden ${box}`}>
        <figcaption className="border-b border-line bg-overlay px-4 py-2 text-sm text-muted">
          <span className="font-semibold text-fg">Cell</span> wrote, {label}
        </figcaption>
        <blockquote className="px-4 py-4 text-lg leading-relaxed">{children}</blockquote>
      </div>
    </figure>
  );
}

const KEEP: { title: string; body: string }[] = [
  {
    title: "The story itself",
    body: "Plays in your browser with its own soundtrack, stop by stop, at your pace.",
  },
  {
    title: "A slide for every stop",
    body: "One 1080 × 1350 PNG per stop, the letter's pages included, ready for a post. Or all of them in a ZIP.",
  },
  { title: "One PDF", body: "The same slides in a single file, for keeping or printing." },
  {
    title: "A public page",
    body: "Every GitHub username has one at /username, built from public activity only. Private repository names never appear, and Settings has a switch to hide yours.",
  },
  {
    title: "An MP4 video",
    body: "In four shapes for every feed, 9:16, 4:5, 1:1 and 16:9, with the soundtrack. Made in your browser.",
  },
];

export function KeepSection() {
  return (
    <section
      id="keep"
      aria-labelledby="keep-title"
      className="overflow-hidden border-t border-line px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1fr] lg:items-center">
        {/* Three slides fanned out. The shadow marks them as printed objects lifted off the page. */}
        <div
          aria-hidden
          className="reveal-zoom relative mx-auto h-[26rem] w-full max-w-md sm:h-[32rem]"
        >
          {(["rhythm", "archetype", "city"] as const).map((file, i) => (
            <Image
              key={file}
              src={`/landing/world-${file}.webp`}
              alt=""
              width={540}
              height={675}
              sizes="18rem"
              className="absolute top-0 left-1/2 h-auto w-56 rounded-xl border border-line shadow-[0_24px_48px_rgb(1_4_9/0.6)] sm:w-72"
              style={{
                transform: `translateX(-50%) translateX(${(i - 1) * 26}%) rotate(${(i - 1) * 7}deg)`,
                zIndex: i === 1 ? 3 : i,
              }}
            />
          ))}
        </div>
        <div>
          <h2 id="keep-title" className={`reveal ${heading}`}>
            Take your year with you.
          </h2>
          <ul className={`mt-10 divide-y divide-line ${box}`}>
            {KEEP.map((item) => (
              <li
                key={item.title}
                className="reveal grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
              >
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const PRIVACY = [
  {
    term: "What it reads",
    detail:
      "Counts GitHub already keeps about your year: contributions, languages, repositories you committed to, stars and pull requests.",
  },
  {
    term: "What it never touches",
    detail: "Your code. Signing in asks GitHub for no repository permissions at all.",
  },
  {
    term: "Where your token lives",
    detail: "On our server only, encrypted at rest. It is never sent to your browser.",
  },
  {
    term: "What goes public",
    detail:
      "A recap of your public activity at /your-username, the same activity your GitHub profile shows. It leaves out private repository names, your timezone and the hours you commit. You can hide it in Settings.",
  },
  {
    term: "How to leave",
    detail: "Delete my data in Settings removes everything and revokes our access to GitHub.",
  },
];

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 fill-green">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function PrivacySection() {
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className="overflow-hidden border-y border-line bg-[#010409] px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 id="privacy-title" className={`reveal-left ${heading}`}>
            Read-only, and yours to delete.
          </h2>
          <dl className={`mt-10 divide-y divide-line ${box}`}>
            {PRIVACY.map(({ term, detail }) => (
              <div key={term} className="reveal flex gap-3 px-5 py-4">
                <Check />
                <div>
                  <dt className="font-semibold">{term}</dt>
                  <dd className="mt-1 text-muted">{detail}</dd>
                </div>
              </div>
            ))}
          </dl>
          <a
            href="/privacy"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-blue hover:underline"
          >
            Read the full privacy policy
          </a>
        </div>
        <Art
          id="cutout-cell-sleep"
          alt="Cell asleep: nothing is shared until you say so"
          className="reveal-right h-auto w-full"
        />
      </div>
    </section>
  );
}

/** Also the source of the FAQPage structured data on the landing page, so both always match. */
export const FAQ = [
  {
    q: "Does WrapYourGit read my code?",
    a: "No. Signing in asks GitHub for no repository permissions, and it only reads the counts GitHub keeps about your activity.",
  },
  {
    q: "Why is my active-days number slightly different from my GitHub profile?",
    a: "Your yearly total matches the profile. On a few days GitHub's public graph files one contribution on the neighbouring day, so active days can differ by one or two.",
  },
  {
    q: "Are private repositories included?",
    a: "Your contributions to private repositories, your own and your organisations', count toward your total. Your public page and its card never name them. Your own story and the files you download show their names only if you choose to, and you can change that in Settings.",
  },
  {
    q: `${EDITION_YEAR} isn't over yet. Is my recap final?`,
    a: 'Not until the year ends. Until then the story says "so far", and you can sync again from your dashboard to bring it up to date.',
  },
  {
    q: "Does it compare with last year?",
    a: "Yes. Your dashboard and the story put this year next to the same stretch of last year, so the comparison is fair while the year is still running.",
  },
  {
    q: "Can I download the video?",
    a: "Yes. At the end of your story, and on your dashboard, you can make an MP4 in four shapes, every stop as a PNG, all of them in a ZIP, or one PDF. They are made in your browser, so keep the tab open while a video renders.",
  },
  {
    q: "Can anyone open a recap of my username?",
    a: "Yes. Like your GitHub profile, a recap of your public activity is open to anyone at /your-username. It never names private repositories. To hide it, sign in and turn on Hide my public recap in Settings.",
  },
  {
    q: "How do I delete my data?",
    a: "Sign in, open Settings and choose Delete my data. It removes your recap and account, hides your public recap and revokes WrapYourGit's access to GitHub.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="overflow-x-clip px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="faq-title" className={heading}>
            Questions people ask.
          </h2>
          <Art id="cutout-cell-think" alt="" className="mt-6 hidden h-auto w-72 lg:block" />
        </div>
        <div className={`divide-y divide-line ${box}`}>
          {FAQ.map(({ q, a }) => (
            <details key={q} className="reveal group">
              <summary className="flex min-h-14 list-none items-center justify-between gap-4 px-5 py-4 font-semibold hover:bg-overlay [&::-webkit-details-marker]:hidden">
                {q}
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="size-4 shrink-0 fill-muted group-open:rotate-180 motion-safe:transition-transform"
                >
                  <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
                </svg>
              </summary>
              <p className="max-w-2xl px-5 pb-5 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

const CLOSING_CELLS = demoLevels(53, 21);

export function ClosingSection({ action }: { action: ReactNode }) {
  return (
    <section
      aria-labelledby="closing-title"
      className="relative overflow-hidden border-t border-line"
    >
      {/* The page closes on the same year of cells it opened with. */}
      <CellField levels={CLOSING_CELLS} animate={false} className="block h-24 w-full sm:h-32" />
      <div className="relative mx-auto grid max-w-7xl items-end gap-6 px-4 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.3fr_1fr]">
        <div className="pb-16 sm:pb-24">
          <h2 id="closing-title" className={`reveal ${heading}`}>
            Your {EDITION_YEAR}, <span className="text-green">told back to you.</span>
          </h2>
          <p className={`mt-6 ${lead}`}>
            One sign-in, a short wait while we read your year, and the story is ready.
          </p>
          <div className="mt-10">{action}</div>
        </div>
        {/* Cell leans in from the bottom edge, cut off by the section. */}
        <Art
          id="cutout-cell-cheer"
          alt=""
          className="mx-auto -mb-16 h-auto w-80 sm:w-[28rem] lg:-mb-20 lg:w-[34rem]"
        />
      </div>
    </section>
  );
}
