import { type ArchetypeId, EDITION_YEAR } from "@wyg/schema";
import { ARCHETYPE_LABELS, STOP_TITLES } from "@wyg/video/copy";
import { OPENINGS } from "@wyg/video/letter";
import Image from "next/image";
import type { ReactNode } from "react";
import { Art } from "@/components/art";
import { SignInNote } from "@/components/site/sign-in-note";
import { FrameReel } from "./frame-reel";
import { ACT_IMAGES, RIDE_IMAGES } from "./frames";
import { MiniIsoCluster } from "./iso-backdrop";

/*
 * Landing sections in the GitHub-dark isometric style (DESIGN.md). Under all of them runs one
 * floor (`.iso-field` on <main>: wall lines that never break), and each section lays its own tone
 * and motif over it (`band tone-* motif-*` in globals.css), split from the next by a border. Every
 * fact comes from the product itself: STOP_TITLES, metrics.md, letter.ts, sampleRecap.
 */

const heading = "text-3xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl";
const lead = "max-w-xl text-lg text-muted";

/** The world's stops in story order: the object keeps STOP_TITLES' declaration order. */
const STOPS = Object.entries(STOP_TITLES);

/**
 * The 14 stops grouped into 3 narrative acts so the viewer reads 3 clear cards instead of a
 * 14-item wall. Each card shows a wide 16:9 scene from the city plus its real stops from
 * `STOP_TITLES`.
 */
const STORY_ACTS = [
  {
    act: "Act 01",
    title: "Arrival & the city grid",
    summary: "Your first day, then every day of the year rising into a city, up to your busiest.",
    image: ACT_IMAGES[0],
    imageAlt: "Act 01 scene: Cell arriving at the contribution city grid",
    stops: STOPS.slice(0, 5),
  },
  {
    act: "Act 02",
    title: "Rhythm, craft & community",
    summary: "Your weekdays, your languages, your projects, stars, pull requests and reviews.",
    image: ACT_IMAGES[1],
    imageAlt: "Act 02 scene: weekday rhythm train, language orchard and project crates",
    stops: STOPS.slice(5, 10),
  },
  {
    act: "Act 03",
    title: "Identity, comparison & letter",
    summary: "Your archetype, this year against last, and a letter from Cell.",
    image: ACT_IMAGES[2],
    imageAlt: "Act 03 scene: developer archetype spotlight and closing fireworks",
    stops: STOPS.slice(10, 14),
  },
] as const;

/** Frames from the public sample (scripts/world-stills.ts --fixture public-sample, 4:5). */
const FRAMES = [
  {
    file: "hello",
    alt: "Hello: Cell's head says hi to @octo-sample and asks, ready for your 2026?",
  },
  {
    file: "first-day",
    alt: "Your first active day of 2026 marked on the isometric plaza",
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
    file: "engineering",
    alt: "Pull requests and reviews: bridges and inspection gates across the city",
  },
  {
    file: "archetype",
    alt: "Your archetype: Builder, Cell in a hard hat under a spotlight, with the reasons",
  },
  {
    file: "versus",
    alt: "Side-by-side comparison against the same span of last year",
  },
  {
    file: "closing",
    alt: "The year in one frame: the total, active days and archetype over fireworks",
  },
] as const;

export function StorySection() {
  return (
    <section
      id="story"
      aria-labelledby="story-title"
      className="band tone-dark motif-lattice reach-left relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <h2 id="story-title" className={`reveal-heading ${heading}`}>
            Your year as a city, <span className="text-green">in three acts.</span>
          </h2>
          <p className={`reveal-right ${lead}`}>
            Every day becomes a building, and a train rides through {STOPS.length} stops of your
            year.
          </p>
        </div>

        <div className="stagger mt-14 grid gap-6 lg:grid-cols-3">
          {STORY_ACTS.map((item) => (
            <article
              key={item.act}
              className="reveal glass-card glass-card-interactive flex flex-col justify-between rounded-xl p-3"
            >
              <div>
                <div className="overflow-clip rounded-lg border border-line bg-canvas">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    sizes="(min-width: 1024px) 360px, 90vw"
                    className="aspect-video h-auto w-full object-cover"
                  />
                </div>
                <h3 className="mt-3 px-1 text-lg font-bold text-fg">{item.title}</h3>
                <p className="mt-1 px-1 pb-1 text-sm leading-relaxed text-muted">{item.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Dedicated section for the real 4:5 story frames so the reel breathes in its own chamber
 * instead of crowding the 3-act overview above.
 */
export function SampleReelSection() {
  const frames = FRAMES.map((frame) => ({
    file: frame.file,
    src: RIDE_IMAGES[frame.file],
    alt: frame.alt,
  }));

  return (
    <section
      aria-labelledby="reel-title"
      className="band tone-green motif-dots reach-center relative overflow-clip py-16 sm:py-20"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <h2 id="reel-title" className="sr-only">
          Frames from a sample story
        </h2>
      </div>

      <div className="reveal-zoom relative z-10">
        <FrameReel frames={frames} />
      </div>
    </section>
  );
}

/**
 * 3-card metrics contract section: explains how numbers are counted (1-3 items per section).
 */
export function MetricsTrioSection() {
  const items = [
    {
      title: "Every day gets a building",
      detail:
        "Commits, pull requests, reviews and issues combine into one daily height. Your longest streak and busiest day are pinned on the grid.",
    },
    {
      title: "Languages by work done, not repo bytes",
      detail:
        "A vendored bundle never steals your top language. Shares come from the repositories you actually committed to in 2026.",
    },
    {
      title: "Measured against the exact same window",
      detail:
        "Running your recap mid-year compares Jan 1 through today against Jan 1 through that same date last year, and labels estimated values clearly.",
    },
  ] as const;

  return (
    <section
      aria-labelledby="metrics-title"
      className="band tone-light motif-hatch reach-right relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <h2 id="metrics-title" className={`reveal-heading ${heading}`}>
              Every number is <span className="text-green">explainable.</span>
            </h2>
          </div>
          <p className={`reveal-right ${lead}`}>
            What GitHub doesn't give us shows as unavailable, never as 0. Anything worked out from
            partial data is labelled an estimate.
          </p>
        </div>

        <div className="stagger mt-14 grid gap-6 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="reveal glass-card glass-card-interactive flex flex-col justify-between rounded-xl p-6"
            >
              <div>
                <h3 className="text-xl font-bold text-fg">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/*
 * Six archetypes from docs/analytics/metrics.md §Archetypes, split across TWO sections of 3 cards
 * each so neither section carries more than 3 items.
 */
const ARCHETYPES_CRAFT: ReadonlyArray<{
  id: ArchetypeId;
  rule: string;
}> = [
  {
    id: "builder",
    rule: "3+ repositories created, or commits are your main signal across the year.",
  },
  {
    id: "consistent",
    rule: "200+ active days, or a 30+ day streak on your contribution calendar.",
  },
  {
    id: "explorer",
    rule: "6+ programming languages with at least 3% commit share each.",
  },
];

const ARCHETYPES_COMMUNITY: ReadonlyArray<{
  id: ArchetypeId;
  rule: string;
}> = [
  {
    id: "collaborator",
    rule: "Reviews + pull requests make up 25%+ of your total activity, with 20+ reviews.",
  },
  {
    id: "night-owl",
    rule: "35%+ of your commits land between 22:00 and 04:59 in your local timezone.",
  },
  {
    id: "open-sourcer",
    rule: "80%+ public contributions across 5+ repositories, or 50+ stars earned this year.",
  },
];

export function ArchetypesSection() {
  return (
    <section
      id="archetypes"
      aria-labelledby="archetypes-title"
      className="band tone-dark motif-dots reach-full relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h2 id="archetypes-title" className={`reveal-heading ${heading}`}>
              What kind of builder were you?
            </h2>
          </div>
          <p className={`reveal-right ${lead}`}>
            One archetype, picked by plain rules, with the facts from your year that earned it.
          </p>
        </div>

        <ul className="stagger mt-14 grid gap-6 lg:grid-cols-3">
          {ARCHETYPES_CRAFT.map(({ id, rule }) => (
            <li
              key={id}
              className="reveal glass-card glass-card-interactive flex flex-col overflow-clip rounded-xl"
            >
              <div className="relative flex items-center justify-center border-b border-line bg-canvas/70 px-6 py-8">
                <Art id={`skin-${id}`} alt="" className="reveal-float w-full max-w-[250px]" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-fg">{ARCHETYPE_LABELS[id]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{rule}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ArchetypesCommunitySection() {
  return (
    <section
      aria-labelledby="archetypes-community-title"
      className="band tone-green motif-lattice reach-bottom relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h2 id="archetypes-community-title" className={`reveal-heading ${heading}`}>
              Or known by your hours &amp; reach.
            </h2>
          </div>
          <p className={`reveal-right ${lead}`}>
            Reviewing for others, working late, or building in public.
          </p>
        </div>

        <ul className="stagger mt-14 grid gap-6 lg:grid-cols-3">
          {ARCHETYPES_COMMUNITY.map(({ id, rule }) => (
            <li
              key={id}
              className="reveal glass-card glass-card-interactive flex flex-col overflow-clip rounded-xl"
            >
              <div className="relative flex items-center justify-center border-b border-line bg-canvas/70 px-6 py-8">
                <Art id={`skin-${id}`} alt="" className="reveal-float w-full max-w-[250px]" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-fg">{ARCHETYPE_LABELS[id]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{rule}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/*
 * Two real openings from packages/video/src/scenes/letter.ts, plus one closing note.
 */
const LETTERS: ReadonlyArray<{
  id: ArchetypeId;
  line: string;
}> = [
  { id: "builder", line: OPENINGS.busy[0] ?? "" },
  { id: "consistent", line: OPENINGS.steady[0] ?? "" },
  { id: "night-owl", line: OPENINGS.quiet[0] ?? "" },
];

export function LetterSection() {
  return (
    <section
      aria-labelledby="letter-title"
      className="band tone-light motif-dots reach-left relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="letter-title" className={`reveal-heading ${heading}`}>
            Then Cell writes you a letter.
          </h2>
          <p className={`reveal mt-6 ${lead}`}>
            A short note at the end of the ride, filled with your numbers. Written from our own
            templates, never by a language model.
          </p>
          <div className="reveal-zoom mt-10">
            <Art id="iso-letter" alt="" className="mx-auto w-full max-w-md" />
          </div>
        </div>

        {/* Three GitHub-style comment boxes on an isometric staircase */}
        <div className="stagger space-y-5 lg:col-span-7">
          {LETTERS.map(({ id, line }, i) => (
            <figure
              key={id}
              className={`reveal glass-card glass-card-interactive overflow-clip rounded-xl ${
                i === 1 ? "lg:ml-8" : i === 2 ? "lg:ml-16" : ""
              }`}
            >
              <figcaption className="border-b border-line px-4 py-2.5 text-sm text-muted">
                To a {ARCHETYPE_LABELS[id]}
              </figcaption>
              <blockquote className="p-5 font-serif text-lg leading-relaxed text-fg italic">
                &ldquo;{line}&rdquo;
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Simplified section for the interactive player & 4 video export shapes (#keep anchor).
 * Concise text, unboxed 4-screen stage illustration, and 3 clean summary cards.
 */
export function VideoExportSection() {
  const specs = [
    {
      title: "Interactive web player",
      detail: "Tap through at your own pace, or let it ride with music.",
    },
    {
      title: "Four aspect ratios",
      detail: "MP4 at 30 fps, sized for stories, feeds and screens.",
    },
    {
      title: "Rendered in your browser",
      detail: "Made on your device. No queue, no upload.",
    },
  ] as const;

  return (
    <section
      id="keep"
      aria-labelledby="keep-title"
      className="band tone-dark motif-hatch reach-right relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 id="keep-title" className={`reveal-heading ${heading}`}>
              Watch it play, or export <span className="text-green">four video shapes.</span>
            </h2>
            <p className={`reveal mt-4 ${lead}`}>
              One story in 9:16, 4:5, 1:1 or 16:9, made in your browser.
            </p>
          </div>
          <div className="reveal-zoom flex justify-center lg:justify-end">
            <MiniIsoCluster kind="video" className="h-auto w-full max-w-md" />
          </div>
        </div>

        <div className="stagger mt-12 grid gap-6 lg:grid-cols-3">
          {specs.map((spec) => (
            <div
              key={spec.title}
              className="reveal glass-card glass-card-interactive rounded-xl p-6"
            >
              <h3 className="text-lg font-bold text-fg">{spec.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{spec.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const KEEP = [
  { name: "Slides", detail: "Every stop as a PNG, one by one or in a ZIP." },
  { name: "PDF", detail: "The whole story in one document." },
  { name: "Share card", detail: "A card for your links, and a public page at your username." },
] as const;

export function KeepSection() {
  return (
    <section
      aria-labelledby="take-title"
      className="band tone-green motif-lattice reach-left relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-12">
        {/*
          Three real frames as plates in one isometric stack: every plate shares the same centre and
          tilt, and only rises by a fixed step, so the edges line up like a pile of prints.
        */}
        <div aria-hidden="true" className="reveal-tilt lg:col-span-5">
          <div className="relative mx-auto h-96 w-full max-w-md sm:h-[30rem]">
            {(["city", "community", "closing"] as const).map((file, i) => (
              <div
                key={file}
                style={{
                  transform: `translate(-50%, -50%) translateY(${(1 - i) * 3.5}rem) rotateX(55deg) rotateZ(-45deg)`,
                  boxShadow:
                    "-8px 8px 0 #1b1a16, -9px 9px 0 #3a372f, -18px 22px 30px rgba(1,4,9,0.7)",
                }}
                className="absolute top-1/2 left-1/2 w-48 overflow-clip border border-green/40 bg-surface sm:w-64"
              >
                <Image
                  src={RIDE_IMAGES[file]}
                  alt=""
                  sizes="256px"
                  className="aspect-[4/5] h-auto w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7">
          <h2 id="take-title" className={`reveal-heading ${heading}`}>
            Take your year with you.
          </h2>
          <p className={`reveal mt-6 ${lead}`}>
            Besides the video: every stop as an image, one PDF, and a card for your links.
          </p>

          <dl className="stagger mt-10 space-y-6">
            {KEEP.map(({ name, detail }) => (
              <div key={name} className="reveal">
                <dt className="text-lg font-bold text-fg">{name}</dt>
                <dd className="mt-1 max-w-xl text-muted">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

const PRIVACY = [
  {
    title: "Your code stays unread",
    detail:
      "Signing in asks GitHub for no repository permissions. We read the counts GitHub keeps about your activity, and your token stays encrypted on our server.",
  },
  {
    title: "Private work stays private",
    detail:
      "Private contributions count in your own total. Your public page is read separately from public activity and never names a private repository.",
  },
  {
    title: "Hide it or delete it",
    detail:
      "In Settings, hide your public page, or delete your data and revoke our access to GitHub in one step.",
  },
] as const;

export function PrivacySection() {
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className="band tone-light motif-dots reach-right relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 id="privacy-title" className={`reveal-heading ${heading}`}>
            Read-only, and <span className="text-green">yours to delete.</span>
          </h2>
          <p className={`reveal mt-6 ${lead}`}>
            Public pages only show what is already public on GitHub.
          </p>

          <dl className="stagger mt-10 space-y-6">
            {PRIVACY.map(({ title, detail }) => (
              <div key={title} className="reveal">
                <dt className="text-lg font-bold text-fg">{title}</dt>
                <dd className="mt-1 max-w-xl text-muted">{detail}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-sm text-muted">
            <a
              href="/privacy"
              className="font-medium text-blue underline decoration-blue/40 underline-offset-4 hover:decoration-blue"
            >
              Read the full privacy policy →
            </a>
          </p>
        </div>

        <div className="reveal-zoom lg:col-span-5">
          <Art id="iso-privacy" alt="" className="mx-auto w-full max-w-md" />
        </div>
      </div>
    </section>
  );
}

/** Exported so `page.tsx` can build matching `FAQPage` structured data from one source. */
export const FAQ = [
  {
    q: "Can I see a recap without signing in?",
    a: `Yes. Type any GitHub username at the top of this page to watch a recap of its public ${EDITION_YEAR} activity. Sign in only to include your private contributions.`,
  },
  {
    q: "Does WrapYourGit read my code?",
    a: "No. Signing in asks GitHub for no repository permissions, and it only reads the counts GitHub keeps about your activity.",
  },
  {
    q: "Are private repositories included?",
    a: "Your contributions to private repositories, your own and your organisations', count toward your total. Your public page and its card never name them. Your own story and files show their names only if you choose to, in Settings.",
  },
  {
    q: "Why is my active-days number slightly different from my GitHub profile?",
    a: "Your yearly total matches the profile. On a few days GitHub's public graph files one contribution on the neighbouring day, so active days can differ by one or two.",
  },
  {
    q: "Can I download the video?",
    a: "Yes. Make an MP4, every stop as a PNG in a ZIP, or one PDF, each in 9:16, 4:5, 1:1 or 16:9, plus a share card. They are made in your browser, so keep the tab open while a video renders.",
  },
  {
    q: "How do I hide my page or delete my data?",
    a: "Sign in and open Settings. Hide my public recap takes your page down. Delete my data removes your recap and account, hides your public recap and revokes WrapYourGit's access to GitHub.",
  },
] as const;

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="band tone-dark motif-hatch reach-sides relative overflow-clip py-24 sm:py-32"
    >
      {/* One centred column: the heading over the list, nothing beside them. */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-8">
        <h2 id="faq-title" className={`reveal-heading text-center ${heading}`}>
          Questions people ask.
        </h2>

        <div className="reveal mt-12 divide-y divide-line rounded-lg border border-line bg-surface text-left">
          {FAQ.map(({ q, a }, i) => (
            <details key={q} open={i === 0} className="faq-item group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-fg select-none [&::-webkit-details-marker]:hidden">
                <span>{q}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="size-4 shrink-0 fill-muted group-open:rotate-90 group-open:fill-green motion-safe:transition-transform motion-safe:duration-200"
                >
                  <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosingSection({ action }: { action: ReactNode }) {
  return (
    <section
      aria-labelledby="closing-title"
      className="band tone-green motif-dots reach-center relative overflow-clip py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
        <div className="reveal-left">
          <h2 id="closing-title" className={heading}>
            Your {EDITION_YEAR}, <span className="text-green">told back to you.</span>
          </h2>
          <p className={`mt-4 ${lead}`}>
            One sign-in, a short wait while we read your year, and the story is ready.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">{action}</div>
          <SignInNote />
        </div>
        <div className="reveal-zoom">
          <Art id="iso-closing" alt="" className="w-full" />
        </div>
      </div>
    </section>
  );
}
