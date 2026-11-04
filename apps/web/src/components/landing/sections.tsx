import { type ArchetypeId, EDITION_YEAR } from "@wyg/schema";
import { ARCHETYPE_LABELS, SCENE_TITLES } from "@wyg/video/copy";
import { OPENINGS } from "@wyg/video/letter";
import { TIMELINE } from "@wyg/video/timeline";
import Image from "next/image";
import type { ReactNode } from "react";
import { CellField, demoLevels } from "@/components/site/cell-field";

/*
 * Landing sections. Every fact here comes from the product itself: chapter lengths from the
 * shared timeline, archetype rules from docs/analytics/metrics.md, letter lines from letter.ts.
 * No invented numbers or quotes (R-17, R-38). Each section has its own composition (RHYTHM 3).
 */

const FIELD: Record<(typeof TIMELINE)[number]["field"], string> = {
  ink: "bg-ink text-paper",
  persimmon: "bg-persimmon text-ink",
  paper: "bg-paper text-ink ring-2 ring-inset ring-ink",
  cobalt: "bg-cobalt text-paper",
};

const SECONDS = TIMELINE.reduce((sum, scene) => sum + scene.beats, 0) / 2; // 120 BPM

const FRAMES = [
  {
    file: "contributions",
    chapter: 2,
    alt: "Contributions chapter: a large total with active days and the longest streak",
  },
  {
    file: "rhythm",
    chapter: 3,
    alt: "Rhythm chapter: a year of contribution cells, the busiest month and weekday bars",
  },
  {
    file: "tech",
    chapter: 4,
    alt: "Languages chapter: rows of cells sized by each language's share",
  },
  {
    file: "identity",
    chapter: 8,
    alt: "Archetype chapter: Builder, with the facts behind it and a 3D diorama",
  },
  {
    file: "closing",
    chapter: 9,
    alt: "Summary chapter: handle, four headline facts and the year as a small graph",
  },
] as const;

export function StorySection() {
  return (
    <section
      id="story"
      aria-labelledby="story-title"
      className="overflow-hidden px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="reveal grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <h2
            id="story-title"
            className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl"
          >
            Nine chapters, about a minute.
          </h2>
          <p className="max-w-xl text-lg sm:text-xl">
            The story moves at the pace of its own soundtrack. You step through it chapter by
            chapter, and every number on screen comes from your GitHub year with a written
            definition behind it.
          </p>
        </div>

        {/* The real running order, each chapter as wide as its share of the music. */}
        <ol aria-label="Chapters in order" className="reveal mt-14 flex flex-col gap-1 md:flex-row">
          {TIMELINE.map((scene, i) => (
            <li
              key={scene.id}
              style={{ flexGrow: scene.beats }}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-[4px] px-3 py-2 md:min-h-32 md:flex-col md:items-start md:justify-end md:basis-0 ${FIELD[scene.field]}`}
            >
              <span className="text-sm font-bold tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-extrabold leading-tight">{SCENE_TITLES[scene.id]}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-base">
          {TIMELINE.length} chapters, {SECONDS} seconds of music, then a letter and your downloads.
        </p>

        <section
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable strip must be reachable by keyboard
          tabIndex={0}
          aria-label="Frames from a sample recap"
          className="-mx-4 mt-16 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0"
        >
          {FRAMES.map((frame, i) => (
            <figure
              key={frame.file}
              className={`w-60 shrink-0 snap-start lg:w-auto ${i % 2 === 1 ? "lg:translate-y-12" : ""}`}
            >
              <Image
                src={`/landing/sample-${frame.file}.webp`}
                alt={frame.alt}
                width={540}
                height={675}
                sizes="(min-width: 1024px) 20vw, 15rem"
                className="h-auto w-full rounded-[var(--radius-control)] ring-2 ring-ink"
              />
              <figcaption className="mt-2 font-bold">
                <span className="tabular-nums">{String(frame.chapter).padStart(2, "0")}</span>{" "}
                {SCENE_TITLES[TIMELINE[frame.chapter - 1]?.id ?? "intro"]}
              </figcaption>
            </figure>
          ))}
        </section>
        <p className="mt-6 text-base lg:mt-16">
          Frames from a recap built on sample data, not a real account.
        </p>
      </div>
    </section>
  );
}

const ARCHETYPES: { id: ArchetypeId; rule: string }[] = [
  {
    id: "builder",
    rule: "You created at least two repositories, or made 50 or more commits to your own.",
  },
  { id: "consistent", rule: "You were active on at least 30% of the days so far." },
  { id: "explorer", rule: "You wrote in four or more languages." },
  {
    id: "collaborator",
    rule: "You left ten or more reviews, or opened ten or more pull requests on other people's repositories.",
  },
  {
    id: "night-owl",
    rule: "At least 40% of your sampled commits landed between 22:00 and 04:00. Estimated, and labelled as such.",
  },
  {
    id: "open-sourcer",
    rule: "You contributed to three or more public repositories you don't own.",
  },
];

export function ArchetypesSection() {
  return (
    <section
      id="archetypes"
      aria-labelledby="archetypes-title"
      className="overflow-hidden bg-persimmon px-4 py-20 text-ink sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="reveal max-w-3xl">
          <h2
            id="archetypes-title"
            className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl"
          >
            What kind of developer were you?
          </h2>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl">
            The climax of the story names your archetype, with the facts that earned it. You get
            one, plus up to two runner-ups you came close to. If none fits yet, the story says so
            honestly: your story is just beginning.
          </p>
        </div>
        <ul className="mt-14 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHETYPES.map(({ id, rule }) => (
            <li key={id} className="reveal border-t-2 border-ink py-6">
              <Image
                src={`/art/cutout-${id}.png`}
                alt=""
                width={1200}
                height={900}
                sizes="(min-width: 1024px) 26vw, (min-width: 640px) 45vw, 90vw"
                className="h-auto w-full max-w-80 origin-bottom-left scale-[1.3]"
              />
              <h3 className="mt-2 text-3xl font-extrabold">{ARCHETYPE_LABELS[id]}</h3>
              <p className="mt-2 text-lg">{rule}</p>
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
    <section aria-labelledby="letter-title" className="overflow-hidden px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <div className="reveal">
          <h2
            id="letter-title"
            className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl"
          >
            Then Cell writes you a letter.
          </h2>
          <p className="mt-6 max-w-xl text-lg sm:text-xl">
            After the last chapter comes a letter from Cell, our mascot. It reads your year the way
            a friend would: fewer numbers, more of what they meant. A quiet year is told it counts.
            A relentless one is told to rest.
          </p>
        </div>
        <div className="reveal relative pt-10 pb-6">
          <Image
            src="/art/cutout-cell-wave.png"
            alt=""
            width={1200}
            height={900}
            sizes="12rem"
            className="absolute -top-12 -right-4 z-10 h-auto w-56 rotate-12 sm:w-64"
          />
          <Note label="For a quiet year" className="-rotate-2">
            {quiet}
          </Note>
          <Note label="For a year that barely stopped" className="mt-6 rotate-1 sm:ml-16">
            {relentless}
          </Note>
        </div>
      </div>
    </section>
  );
}

function Note({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <figure className={`max-w-lg border-2 border-ink bg-[#fbf8f1] p-6 sm:p-8 ${className}`}>
      <figcaption className="text-base font-bold">{label}</figcaption>
      <blockquote className="mt-3 text-xl leading-relaxed">{children}</blockquote>
    </figure>
  );
}

const KEEP: { title: string; body: string; soon?: boolean }[] = [
  {
    title: "The story itself",
    body: "Plays in your browser with its own soundtrack, chapter by chapter, at your pace.",
  },
  {
    title: "Ten slides as PNG",
    body: "One 1080 × 1350 image per chapter plus the letter, ready for a post. Or all ten in a ZIP.",
  },
  { title: "One PDF", body: "The same ten slides in a single file, for keeping or printing." },
  {
    title: "A public page",
    body: `Off until you publish it. Then your ${EDITION_YEAR} lives at /u/your-login, with private repository names removed.`,
  },
  {
    title: "An MP4 video",
    body: "In four shapes for every feed. We are still setting up rendering.",
    soon: true,
  },
];

export function KeepSection() {
  return (
    <section
      id="keep"
      aria-labelledby="keep-title"
      className="on-dark overflow-hidden bg-cobalt px-4 py-20 text-paper sm:px-8 sm:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1fr] lg:items-center">
        {/* Three printed slides, fanned. The shadow marks them as objects lifted off the page. */}
        <div aria-hidden className="reveal relative mx-auto h-[26rem] w-full max-w-md sm:h-[32rem]">
          {(["rhythm", "identity", "contributions"] as const).map((file, i) => (
            <Image
              key={file}
              src={`/landing/sample-${file}.webp`}
              alt=""
              width={540}
              height={675}
              sizes="18rem"
              className="absolute top-0 left-1/2 h-auto w-56 rounded-[var(--radius-control)] shadow-[0_18px_40px_rgb(20_19_15/0.45)] sm:w-72"
              style={{
                transform: `translateX(-50%) translateX(${(i - 1) * 26}%) rotate(${(i - 1) * 7}deg)`,
                zIndex: i === 1 ? 3 : i,
              }}
            />
          ))}
        </div>
        <div>
          <h2
            id="keep-title"
            className="reveal text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl"
          >
            Take your year with you.
          </h2>
          <ul className="mt-10 divide-y-2 divide-paper/30 border-y-2 border-paper/30">
            {KEEP.map((item) => (
              <li
                key={item.title}
                className="reveal grid gap-1 py-5 sm:grid-cols-[12rem_1fr] sm:gap-6"
              >
                <h3 className="text-xl font-extrabold">
                  {item.title}
                  {item.soon && (
                    <span className="ml-2 inline-block rounded-[4px] bg-paper px-1.5 align-middle text-sm text-ink">
                      Coming soon
                    </span>
                  )}
                </h3>
                <p className="text-lg">{item.body}</p>
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
    detail: "Your code. WrapYourGit asks GitHub for no repository permissions at all.",
  },
  {
    term: "Where your token lives",
    detail: "On our server only, encrypted at rest. It is never sent to your browser.",
  },
  {
    term: "What goes public",
    detail:
      "Nothing, until you publish. A published recap drops private repository names, your timezone and the hours you commit.",
  },
  {
    term: "How to leave",
    detail: "Delete my data on your dashboard removes everything and revokes our access to GitHub.",
  },
];

export function PrivacySection() {
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className="on-dark relative overflow-hidden bg-ink px-4 py-20 text-paper sm:px-8 sm:py-28"
    >
      <Image
        src="/art/cutout-cell-sleep.png"
        alt=""
        width={1200}
        height={900}
        sizes="36rem"
        className="pointer-events-none absolute -right-16 -bottom-24 hidden h-auto w-[36rem] lg:block"
      />
      <div className="relative mx-auto max-w-7xl">
        <h2
          id="privacy-title"
          className="reveal max-w-3xl text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl"
        >
          Read-only, and yours to delete.
        </h2>
        <dl className="mt-14 grid max-w-4xl gap-x-12 gap-y-8 sm:grid-cols-2">
          {PRIVACY.map(({ term, detail }) => (
            <div key={term} className="reveal">
              <dt className="flex items-center gap-2 text-xl font-extrabold">
                <span aria-hidden className="size-3 rounded-[2px] bg-cell" />
                {term}
              </dt>
              <dd className="mt-2 text-lg">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "Does WrapYourGit read my code?",
    a: "No. It asks GitHub for no repository permissions and only reads the counts GitHub keeps about your activity.",
  },
  {
    q: "Why is my active-days number slightly different from my GitHub profile?",
    a: "Your yearly total matches the profile. On a few days GitHub's public graph files one contribution on the neighbouring day, so active days can differ by one or two.",
  },
  {
    q: "Are private repositories included?",
    a: "Their contributions count toward your total when your GitHub profile shows private contributions. Their names never appear in anything you can share.",
  },
  {
    q: `${EDITION_YEAR} isn't over yet. Is my recap final?`,
    a: 'Not until the year ends. Until then the story says "so far", and you can sync again from your dashboard to bring it up to date.',
  },
  {
    q: "Can I download the video?",
    a: "Not yet. MP4 export is still being set up. Today you can download every slide as a PNG, all of them as a ZIP, or one PDF.",
  },
  {
    q: "How do I delete my data?",
    a: "Open your dashboard and choose Delete my data. It removes your recap and account and revokes WrapYourGit's access to GitHub.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2
            id="faq-title"
            className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl"
          >
            Questions people ask.
          </h2>
          <Image
            src="/art/cutout-cell-think.png"
            alt=""
            width={1200}
            height={900}
            sizes="16rem"
            className="mt-6 hidden h-auto w-64 lg:block"
          />
        </div>
        <div className="border-t-2 border-ink">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group border-b-2 border-ink">
              <summary className="flex min-h-16 list-none items-center justify-between gap-4 py-4 text-xl font-extrabold hover:underline [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-ink text-paper group-open:bg-cell group-open:text-ink"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 12 12"
                    className="size-3 group-open:rotate-45 motion-safe:transition-transform"
                    fill="currentColor"
                  >
                    <path d="M5 0h2v5h5v2H7v5H5V7H0V5h5z" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-2xl pb-6 text-lg">{a}</p>
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
      className="on-dark relative overflow-hidden bg-ink text-paper"
    >
      {/* The page closes on the same year of cells it opened with. */}
      <CellField levels={CLOSING_CELLS} animate={false} className="block h-24 w-full sm:h-32" />
      <div className="relative mx-auto grid max-w-7xl items-end gap-6 px-4 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.3fr_1fr]">
        <div className="pb-16 sm:pb-24">
          <h2
            id="closing-title"
            className="reveal text-6xl leading-[0.92] font-extrabold tracking-tight sm:text-8xl"
          >
            Your {EDITION_YEAR},<span className="block text-cell">told back to you.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg sm:text-xl">
            One sign-in, a short wait while we read your year, and the story is ready.
          </p>
          <div className="mt-10">{action}</div>
        </div>
        {/* Cell leans in from the bottom edge, cut off by the section. */}
        <Image
          src="/art/cutout-cell-cheer.png"
          alt=""
          width={1200}
          height={900}
          sizes="(min-width: 1024px) 32rem, 80vw"
          className="mx-auto -mb-16 h-auto w-80 sm:w-[28rem] lg:-mb-20 lg:w-[34rem]"
        />
      </div>
    </section>
  );
}
