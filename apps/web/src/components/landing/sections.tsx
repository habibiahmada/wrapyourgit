import { type ArchetypeId, EDITION_YEAR } from "@wyg/schema";
import { ARCHETYPE_LABELS, STOP_TITLES } from "@wyg/video/copy";
import { OPENINGS } from "@wyg/video/letter";
import Image from "next/image";
import type { ReactNode } from "react";
import { Art } from "@/components/art";
import { SITE } from "@/site";
import { FrameReel } from "./frame-reel";
import { GlowOrb, IsoBackdrop, MiniIsoCluster } from "./iso-backdrop";

/*
 * Landing sections in the GitHub-dark style (DESIGN.md): dark canvas, surface boxes with hairline
 * borders, GitHub's contribution greens as the one accent, and isometric dioramas with Cell
 * (baked loops, ADR-0021; the hero's scene and the small clusters are server-drawn SVG, iso.ts).
 * A section holds one to three things. Every fact comes from the product itself: the stops from
 * the story world's copy, archetype rules and definitions from metrics.md, letter lines from
 * letter.ts. No invented numbers or quotes (R-17, R-38).
 *
 * Glass (`glass-card`) is only for cards that stand in front of an isometric room
 * (`IsoBackdrop`), where there is something to see through them; a card on a plain band is a
 * solid surface box (R-10).
 */

const box = "rounded-xl border border-line bg-surface";
const heading = "text-3xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl";
const lead = "max-w-xl text-lg text-muted";
/** A band in the header's black, between two bands on the canvas. */
const band = "border-y border-line bg-[#010409]";
/** Sits above a section's `IsoBackdrop`. */
const above = "relative z-10";

/** The world's stops in story order: the object keeps STOP_TITLES' declaration order. */
const STOPS = Object.entries(STOP_TITLES);
type StopKind = keyof typeof STOP_TITLES;
const stopNumber = (kind: StopKind) =>
  String(STOPS.findIndex(([k]) => k === kind) + 1).padStart(2, "0");

/** The fourteen stops as the three acts the story plays them in, each under a frame of it. */
const ACTS: { title: string; body: string; alt: string; stops: StopKind[] }[] = [
  {
    title: "The city rises",
    body: "Cell says hello, your first contribution of the year lights up, and every day becomes a building.",
    alt: "The whole sample year as a city seen from above, the rail winding past every station, under a sign reading 1,284 contributions",
    stops: ["hello", "first-day", "private", "city", "busiest"],
  },
  {
    title: "How you worked",
    body: "The weekdays that carried you, the languages you wrote, the repositories, the stars and the pull requests.",
    alt: "Seven wagons loaded with crates, one per weekday, Tuesday's the fullest, as Cell's train pulls in",
    stops: ["rhythm", "languages", "projects", "community", "engineering"],
  },
  {
    title: "The finale",
    body: "Your archetype with the facts behind it, this year against last, a letter from Cell and the year in one frame.",
    alt: "A sign reading This year you were Builder over a city block where Cell in a hard hat stands by a crane",
    stops: ["archetype", "versus", "letter", "closing"],
  },
];

/**
 * Frames of the story ride from the public sample
 * (scripts/ride-stills.ts <stop> --fixture public-sample --format 4x5, then 540 x 675 WebP).
 */
const FRAMES = [
  {
    file: "hello",
    alt: "Hello: Cell at the controls of a small green engine under a sign reading 2026, @octo-sample, public GitHub activity only",
  },
  {
    file: "first-day",
    alt: "Your first day: a wall of the year's squares with the first one lit and a flag on it, under a sign reading Jan 2, Friday",
  },
  {
    file: "city",
    alt: "Your year as a city, seen from above: the rail winds past every station under a sign reading 1,284 contributions",
  },
  {
    file: "busiest",
    alt: "Your busiest day: a green tower with a number-one plate beside a calendar page for January 3, 8 contributions",
  },
  {
    file: "rhythm",
    alt: "Your rhythm: seven wagons loaded with crates, one per weekday, Tuesday's the fullest at 240",
  },
  {
    file: "languages",
    alt: "Languages: three blocks sized by share, TypeScript 42%, JavaScript 28%, Python 18%",
  },
  {
    file: "projects",
    alt: "Projects: containers stacked by commits, trailmix 312, private repositories 188 with no names, dotfiles 96, design-tokens 41",
  },
  {
    file: "community",
    alt: "Community: an observatory under a sky of stars, 128 stars earned and 12 forks this year",
  },
  {
    file: "engineering",
    alt: "Engineering: a rail junction under a board reading 64 pull requests sent, 51 merged, 40 reviews given",
  },
  {
    file: "archetype",
    alt: "Your archetype: Builder, Cell in a hard hat in a city block where a building goes up under a crane",
  },
  {
    file: "versus",
    alt: "Against last year: two blocks side by side, 1,031 contributions in 2025 and 1,284 in 2026, up 25%",
  },
  {
    file: "closing",
    alt: "The year in one frame: a board reading 2026, 1,284 contributions, 186 active days, Builder",
  },
] as const;

/** The story as three acts: one box, a column to an act, so the fourteen stops read as three. */
export function JourneySection() {
  return (
    <section id="story" aria-labelledby="story-title" className="overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <h2 id="story-title" className={`reveal-left ${heading}`}>
            Your year as a city, in three acts.
          </h2>
          <p className={`reveal-right ${lead}`}>
            Every day of your year becomes a building. The story moves from stop to stop and waits
            for your tap, and every number on screen comes from your GitHub year with a written
            definition behind it.
          </p>
        </div>

        <ol className={`reveal mt-14 grid overflow-hidden md:grid-cols-3 ${box}`}>
          {ACTS.map((act, i) => (
            <li
              key={act.title}
              className="flex flex-col border-line max-md:border-t max-md:first:border-t-0 md:border-l md:first:border-l-0"
            >
              {/* A real frame of the act, from the sample ride: what it is, not a symbol of it. */}
              <Image
                src={`/landing/act-${i + 1}.webp`}
                alt={act.alt}
                width={960}
                height={540}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="h-auto w-full border-b border-line"
              />
              <div className="flex flex-1 flex-col p-6">
                <p className="text-sm font-semibold text-muted">Act {i + 1}</p>
                <h3 className="mt-1 text-xl font-bold">{act.title}</h3>
                <p className="mt-2 text-muted">{act.body}</p>
                {/* The real running order: the numbers carry on from act to act. */}
                <ol
                  aria-label={`Stops in act ${i + 1}`}
                  className="mt-5 grid gap-1.5 border-t border-line pt-5"
                >
                  {act.stops.map((kind) => (
                    <li key={kind} className="flex items-baseline gap-3 text-sm">
                      <span className="font-semibold text-muted tabular-nums">
                        {stopNumber(kind)}
                      </span>
                      <span className="font-semibold">{STOP_TITLES[kind]}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          {STOPS.length} stops, the letter sometimes over a few pages, then your downloads.
        </p>
      </div>
    </section>
  );
}

/** Real frames of the story, on their own band so the acts above stay three things. */
export function ReelSection() {
  return (
    <section aria-labelledby="reel-title" className={`overflow-hidden py-20 sm:py-24 ${band}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <h2 id="reel-title" className={`reveal-left max-w-2xl ${heading}`}>
          Frames from a sample year.
        </h2>
        <p className={`reveal mt-5 ${lead}`}>
          Twelve of the stops, as the story draws them. They come from a recap built on sample data,
          not a real account.
        </p>
      </div>
      <div className="reveal mt-10">
        <FrameReel
          frames={FRAMES.map((frame) => ({
            ...frame,
            label: `${stopNumber(frame.file)} ${STOP_TITLES[frame.file]}`,
          }))}
        />
      </div>
    </section>
  );
}

/** What the story stands on. Definitions are docs/analytics/metrics.md, in plain words. */
const METRICS: {
  art: "calendar" | "languages" | "compare";
  title: string;
  body: string;
}[] = [
  {
    art: "calendar",
    title: "A building for every day",
    body: "Your contribution calendar, one entry per day. A day with more contributions stands taller, and the yearly total is the one your GitHub profile shows.",
  },
  {
    art: "languages",
    title: "Languages by what you committed",
    body: "Each repository's languages are weighted by your commits there, so a large repository you barely touched does not decide your top language.",
  },
  {
    art: "compare",
    title: "This year against the same days of last",
    body: "While the year is still running, the story compares it with last year up to the same date, so the comparison stays fair.",
  },
];

/** Three measures, the calendar largest: it is the one the whole city is drawn from. */
export function MetricsSection() {
  const [calendar, ...rest] = METRICS;
  return (
    <section
      aria-labelledby="metrics-title"
      className="overflow-hidden px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 id="metrics-title" className={`reveal-left ${heading}`}>
            The numbers under the city.
          </h2>
          <p className={`reveal mt-6 max-w-2xl ${lead}`}>
            Every figure in the story has a written definition. These three carry most of it.
          </p>
        </div>
        <ul className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {calendar && (
            <li className={`reveal-float flex flex-col overflow-hidden lg:row-span-2 ${box}`}>
              <div className="flex flex-1 items-center border-b border-line bg-canvas px-6 py-8">
                <MiniIsoCluster kind={calendar.art} className="mx-auto max-w-md" />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold">{calendar.title}</h3>
                <p className="mt-2 max-w-xl text-muted">{calendar.body}</p>
              </div>
            </li>
          )}
          {rest.map((metric) => (
            <li
              key={metric.art}
              className={`reveal-float grid overflow-hidden sm:grid-cols-[13rem_1fr] ${box}`}
            >
              <div className="flex items-center border-line bg-canvas px-5 py-5 max-sm:border-b sm:border-r">
                <MiniIsoCluster kind={metric.art} className="mx-auto max-w-48" />
              </div>
              <div className="self-center p-6">
                <h3 className="text-xl font-bold">{metric.title}</h3>
                <p className="mt-2 text-muted">{metric.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <a
          href={`${SITE.repository}/blob/main/docs/analytics/metrics.md`}
          className="mt-6 inline-flex min-h-11 items-center font-semibold text-blue hover:underline"
        >
          Read every definition
        </a>
      </div>
    </section>
  );
}

/** What each archetype's diorama shows, for its alt text. */
const SCENES: Record<ArchetypeId, string> = {
  builder:
    "Cell in a hard hat, hammering, in the middle of a city block where a building is going up under a crane",
  consistent:
    "Cell in a sweatband running in the middle of a city block with a running track, a podium and a clock tower",
  explorer:
    "Cell in a cap and backpack waving in the middle of a block with a snowy mountain, a lake, tents and a lighthouse",
  collaborator:
    "Cell in a headset in the middle of an office campus where a team in every colour talks round café tables",
  "night-owl":
    "Cell in glasses in the middle of a city block late at night, most windows lit, an owl on a roof",
  "open-sourcer":
    "Cell in a scarf cheering in the middle of a town square with a stage, a crowd, market stalls and a fountain",
};

const RULES: Record<ArchetypeId, string> = {
  builder: "You created at least two repositories, or made 50 or more commits to your own.",
  consistent: "You were active on at least 30% of the days so far.",
  explorer: "You wrote in four or more languages.",
  collaborator:
    "You left ten or more reviews, or opened ten or more pull requests on other people's repositories.",
  "night-owl":
    "At least 40% of your sampled commits landed between 22:00 and 04:00. Estimated, and labelled as such.",
  "open-sourcer": "You contributed to three or more public repositories you don't own.",
};

/** The six archetypes by what earns them, three to a row. */
const TIERS: { title: string; ids: ArchetypeId[] }[] = [
  { title: "Earned by what you made", ids: ["builder", "consistent", "explorer"] },
  {
    title: "Earned by who you worked with, and when",
    ids: ["collaborator", "open-sourcer", "night-owl"],
  },
];

export function ArchetypesSection() {
  return (
    <section
      id="archetypes"
      aria-labelledby="archetypes-title"
      className={`relative overflow-hidden px-4 py-24 sm:px-8 sm:py-32 ${band}`}
    >
      <IsoBackdrop variant="green" corner={0.82} />
      <div className={`mx-auto max-w-7xl ${above}`}>
        <div className="max-w-3xl">
          <h2 id="archetypes-title" className={`reveal-left ${heading}`}>
            What kind of developer were you?
          </h2>
          <p className={`reveal mt-6 max-w-2xl ${lead}`}>
            The climax of the story names your archetype, with the facts that earned it. You get
            one, plus up to two runner-ups you came close to. If none fits yet, the story says so.
          </p>
        </div>
        {TIERS.map((tier) => (
          <div key={tier.title} className="mt-14">
            <h3 className="reveal border-b border-line pb-3 text-sm font-semibold text-muted">
              {tier.title}
            </h3>
            <ul className="mt-6 grid gap-6 md:grid-cols-3">
              {tier.ids.map((id) => (
                <li key={id} className="reveal-float glass-card overflow-hidden rounded-xl">
                  {/* Each diorama is the place the archetype's rule happens; the text states it. */}
                  <div className="border-b border-line bg-canvas">
                    <Art id={`skin-${id}`} alt={SCENES[id]} className="h-auto w-full" />
                  </div>
                  <div className="p-5">
                    <h4 className="text-xl font-bold">{ARCHETYPE_LABELS[id]}</h4>
                    <p className="mt-2 text-base text-muted">{RULES[id]}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LetterSection() {
  const quiet = OPENINGS.quiet[1];
  const steady = OPENINGS.steady[1];
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
          <Art
            id="iso-letter"
            alt="Cell in glasses, thinking, in the middle of a city block round a post office: pillar boxes with a queue, mail vans, a letter as tall as a house, envelopes in the air"
            className="mt-8 h-auto w-full max-w-lg"
          />
        </div>
        <div className="reveal-right relative flex flex-col gap-5">
          <Comment label="for a quiet year">{quiet}</Comment>
          <Comment label="for a steady year" className="sm:ml-12">
            {steady}
          </Comment>
          <Comment label="for a year that barely stopped" className="sm:ml-24">
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

/** Watching it, and the video of it. */
const PLAYER: { title: string; body: string }[] = [
  {
    title: "At your pace",
    body: "The story plays in your browser with its own soundtrack, stop by stop, and waits for your tap.",
  },
  {
    title: "Four shapes",
    body: "An MP4 in 9:16, 4:5, 1:1 and 16:9, with the soundtrack: one for every feed.",
  },
  {
    title: "Made on your device",
    body: "The video is made in your browser, not on a server. Keep the tab open while it renders.",
  },
];

export function PlayerSection() {
  return (
    <section
      id="keep"
      aria-labelledby="player-title"
      className={`overflow-hidden px-4 py-24 sm:px-8 sm:py-32 ${band}`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 id="player-title" className={`reveal-left ${heading}`}>
              Watch it here. Keep it as a video.
            </h2>
            <p className={`reveal mt-6 ${lead}`}>
              The same story that plays on the page becomes a file you can post, in the shape each
              feed wants.
            </p>
          </div>
          {/* Four standing frames, one to a shape of the video. */}
          <MiniIsoCluster kind="video" className="reveal-tilt mx-auto max-w-sm" />
        </div>
        <ul className={`reveal mt-12 grid overflow-hidden sm:grid-cols-3 ${box}`}>
          {PLAYER.map((item) => (
            <li
              key={item.title}
              className="border-line p-6 max-sm:border-t max-sm:first:border-t-0 sm:border-l sm:first:border-l-0"
            >
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** What you can hold on to besides the video. */
const PRINTS: { title: string; body: string }[] = [
  {
    title: "A slide for every stop",
    body: "One 1080 × 1350 PNG per stop, the letter's pages included, ready for a post. Or all of them in a ZIP.",
  },
  { title: "One PDF", body: "The same slides in a single file, for keeping or printing." },
  {
    title: "A public page",
    body: "Every GitHub username has one at /username, built from public activity only. Private repository names never appear, and Settings has a switch to hide yours.",
  },
];

export function PrintsSection() {
  return (
    <section aria-labelledby="prints-title" className="overflow-hidden px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1fr] lg:items-center">
        {/* Three real slides laid flat in the page's isometric projection, stacked like prints.
            The 2D transform maps a rectangle onto an isometric tile, so they match the art. */}
        <div
          aria-hidden
          className="reveal-zoom relative mx-auto h-[24rem] w-full max-w-md sm:h-[30rem]"
        >
          {(["city", "archetype", "rhythm"] as const).map((file, i) => (
            <Image
              key={file}
              src={`/landing/ride-${file}.webp`}
              alt=""
              width={540}
              height={675}
              sizes="16rem"
              className="absolute left-1/2 h-auto w-48 rounded-lg border border-line sm:w-60"
              style={{
                top: `${8 + i * 18}%`,
                transform:
                  "translateX(-50%) rotate(-30deg) skewX(30deg) scaleY(0.864) rotate(0deg)",
                boxShadow: i === 0 ? "none" : "0 -2px 0 #30363d",
                zIndex: 3 - i,
              }}
            />
          ))}
        </div>
        <div>
          <h2 id="prints-title" className={`reveal ${heading}`}>
            Take your year with you.
          </h2>
          <ul className={`mt-10 divide-y divide-line ${box}`}>
            {PRINTS.map((item) => (
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

/** The five facts of the old checklist, as the three promises they add up to. */
const PRIVACY: { title: string; facts: string[] }[] = [
  {
    title: "Counts, never code",
    facts: [
      "It reads counts GitHub already keeps about your year: contributions, languages, repositories you committed to, stars and pull requests.",
      "Signing in asks GitHub for no repository permissions at all.",
    ],
  },
  {
    title: "Your token stays on our server",
    facts: ["Encrypted at rest, and never sent to your browser."],
  },
  {
    title: "Public is your call, and so is leaving",
    facts: [
      "The page at /your-username shows public activity only: no private repository names, no timezone, no commit hours. Settings can hide it.",
      "Delete my data in Settings removes everything and revokes our access to GitHub.",
    ],
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
      className={`relative overflow-hidden px-4 py-24 sm:px-8 sm:py-32 ${band}`}
    >
      <IsoBackdrop variant="blue" density="sparse" />
      <div className={`mx-auto max-w-7xl ${above}`}>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 id="privacy-title" className={`reveal-left ${heading}`}>
              Read-only, and yours to delete.
            </h2>
            <p className={`reveal mt-6 ${lead}`}>
              Three promises, each one something you can check in Settings or on GitHub.
            </p>
            <a
              href="/privacy"
              className="mt-6 inline-flex min-h-11 items-center font-semibold text-blue hover:underline"
            >
              Read the full privacy policy
            </a>
          </div>
          <Art
            id="iso-privacy"
            alt="Cell standing guard in the middle of a city block round a vault with a round door: a data centre behind a fence, a guard post, cameras, and padlocks and keys in the air"
            className="reveal-right h-auto w-full"
          />
        </div>
        <ul className="mt-12 grid items-start gap-6 md:grid-cols-3">
          {PRIVACY.map(({ title, facts }) => (
            <li key={title} className="reveal-float glass-card rounded-xl p-6">
              <h3 className="text-xl font-bold">{title}</h3>
              <ul className="mt-4 grid gap-3">
                {facts.map((fact) => (
                  <li key={fact} className="flex gap-3 text-muted">
                    <Check />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The questions in two groups: what happens to your data, and what the recap is. */
const FAQ_GROUPS = [
  {
    title: "About your data",
    items: [
      {
        q: "Does WrapYourGit read my code?",
        a: "No. Signing in asks GitHub for no repository permissions, and it only reads the counts GitHub keeps about your activity.",
      },
      {
        q: "Are private repositories included?",
        a: "Your contributions to private repositories, your own and your organisations', count toward your total. Your public page and its card never name them. Your own story and the files you download show their names only if you choose to, and you can change that in Settings.",
      },
      {
        q: "Can anyone open a recap of my username?",
        a: "Yes. Like your GitHub profile, a recap of your public activity is open to anyone at /your-username. It never names private repositories. To hide it, sign in and turn on Hide my public recap in Settings.",
      },
      {
        q: "How do I delete my data?",
        a: "Sign in, open Settings and choose Delete my data. It removes your recap and account, hides your public recap and revokes WrapYourGit's access to GitHub.",
      },
    ],
  },
  {
    title: "About your recap",
    items: [
      {
        q: "Why is my active-days number slightly different from my GitHub profile?",
        a: "Your yearly total matches the profile. On a few days GitHub's public graph files one contribution on the neighbouring day, so active days can differ by one or two.",
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
    ],
  },
];

/** Also the source of the FAQPage structured data on the landing page, so both always match. */
export const FAQ = FAQ_GROUPS.flatMap((group) => group.items);

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
          <Art
            id="cutout-cell-think"
            alt=""
            width={600}
            height={600}
            className="mt-4 -ml-6 hidden h-auto w-64 lg:block"
          />
        </div>
        <div className="grid gap-10">
          {FAQ_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-muted">{group.title}</h3>
              <div className={`mt-3 divide-y divide-line ${box}`}>
                {group.items.map(({ q, a }) => (
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
      className="relative overflow-hidden border-t border-line bg-[#010409]"
    >
      <IsoBackdrop variant="green" density="sparse" />
      {/* The page's second and last glow: the hero's is under its busiest day (R-13). */}
      <GlowOrb color="green" position="right" />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 id="closing-title" className={`reveal ${heading}`}>
            Your {EDITION_YEAR}, <span className="text-green">told back to you.</span>
          </h2>
          <p className={`mt-6 ${lead}`}>
            One sign-in, a short wait while we read your year, and the story is ready.
          </p>
          <div className="mt-10">{action}</div>
        </div>
        {/* The page closes on a whole year: the hero showed a quarter of it. */}
        <figure className="min-w-0">
          <Art
            id="iso-closing"
            alt="A whole sample year as a city of contribution towers with lit windows, a small train running along its front, Cell crowned on a stage before a cheering crowd, fireworks above"
            width={1600}
            height={900}
            className="h-auto w-full"
          />
        </figure>
      </div>
    </section>
  );
}
