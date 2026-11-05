import type { RecapData } from "@wyg/schema";
import { heatLevels } from "@wyg/video/heat";
import type { Letter } from "@wyg/video/letter";
import { Art } from "@/components/art";

/** GitHub's contribution ramp, levels 1-4; level 0 is a faint ink square. */
const HEAT = ["rgba(20, 19, 15, 0.08)", "#9BE9A8", "#40C463", "#30A14E", "#216E39"] as const;

/**
 * Fixed spots for the paper's motif: contribution cells in the margins, as fractions of the
 * sheet. Decoration only (aria-hidden), in ink at low opacity so the text keeps its contrast.
 */
const MOTIF: { x: number; y: number; s: number; lit?: boolean }[] = [
  { x: 0.015, y: 0.3, s: 14 },
  { x: 0.03, y: 0.34, s: 9, lit: true },
  { x: 0.012, y: 0.52, s: 11 },
  { x: 0.965, y: 0.42, s: 12 },
  { x: 0.95, y: 0.47, s: 8, lit: true },
  { x: 0.972, y: 0.66, s: 10 },
  { x: 0.02, y: 0.78, s: 9 },
  { x: 0.96, y: 0.86, s: 13 },
];

/**
 * The letter from Cell as stationery: a letterhead with Cell's head, a postmark, the person's own
 * last weeks of contributions as the rule under the head, a faint motif of cells and a branch
 * graph on the paper, and a signature with a row of lit cells. The PNG/PDF letter slide draws the
 * same sheet (server/slides.tsx).
 */
export function LetterSheet({ data, letter }: { data: RecapData; letter: Letter }) {
  const year = data.meta.year;
  const strip = heatLevels(data.contributions.calendar).slice(-53);

  return (
    <article className="on-light relative overflow-hidden rounded-xl bg-paper px-6 py-8 text-ink sm:px-12 sm:py-12">
      {/* The paper's motif: cells in the margins and a branch graph along the foot. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {MOTIF.map(({ x, y, s, lit }) => (
          <span
            key={`${x}-${y}`}
            className="absolute rounded-[3px]"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: s,
              height: s,
              background: lit ? "rgba(64, 196, 99, 0.45)" : "transparent",
              border: lit ? undefined : "2px solid rgba(20, 19, 15, 0.12)",
            }}
          />
        ))}
        <svg className="absolute right-0 bottom-3 left-0 h-8 w-full" preserveAspectRatio="none">
          <title>branch graph</title>
          <line x1="0" y1="24" x2="100%" y2="24" stroke="rgba(20,19,15,0.12)" strokeWidth="2" />
          <path
            d="M 180 24 C 205 24 205 8 230 8 L 330 8 C 355 8 355 24 380 24"
            stroke="rgba(20,19,15,0.12)"
            strokeWidth="2"
            fill="none"
          />
          {[60, 140, 420, 520].map((cx) => (
            <circle
              key={cx}
              cx={cx}
              cy="24"
              r="5"
              fill="#F4EFE3"
              stroke="rgba(20,19,15,0.18)"
              strokeWidth="2"
            />
          ))}
          {[255, 305].map((cx) => (
            <circle key={cx} cx={cx} cy="8" r="5" fill="rgba(64,196,99,0.6)" />
          ))}
        </svg>
      </div>

      {/* Letterhead: Cell's head, the sender, and a postmark. */}
      <header className="relative flex items-center gap-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-[#9BE9A8]/40 sm:size-20">
          <Art id="head-cell" alt="" width={600} height={600} className="size-full" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-extrabold leading-tight sm:text-2xl">WrapYourGit</p>
          <p className="text-sm font-bold text-ink-soft sm:text-base">From Cell · {year}</p>
        </div>
        <svg
          aria-hidden
          viewBox="0 0 120 120"
          className="ml-auto size-20 shrink-0 rotate-[-8deg] text-persimmon sm:size-24"
        >
          <title>postmark</title>
          <defs>
            <path id="postmark-ring" d="M 60 60 m -42 0 a 42 42 0 1 1 84 0 a 42 42 0 1 1 -84 0" />
          </defs>
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="2" />
          <text fill="currentColor" fontSize="9.5" fontWeight="800" letterSpacing="1.2">
            <textPath href="#postmark-ring">WRAPYOURGIT · DELIVERED BY CELL ·</textPath>
          </text>
          <text
            x="60"
            y="67"
            textAnchor="middle"
            fill="currentColor"
            fontSize="22"
            fontWeight="800"
          >
            {year}
          </text>
        </svg>
      </header>

      {/* The rule under the letterhead: the last weeks of this person's own graph. */}
      <div aria-hidden className="relative mt-5 flex gap-[3px]">
        {strip.map((level, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: one square per day, in order
            key={i}
            className="aspect-square min-w-0 flex-1 rounded-[2px]"
            style={{ background: HEAT[level] ?? HEAT[0] }}
          />
        ))}
      </div>

      <p className="relative mt-8 text-3xl font-extrabold sm:text-4xl">{letter.greeting}</p>
      <div className="relative mt-6 flex max-w-[62ch] flex-col gap-5">
        {letter.paragraphs.map((paragraph, i) => (
          <p
            key={paragraph}
            className={`leading-[1.7] motion-safe:animate-[rise_700ms_ease-out_both] ${i === 0 ? "text-xl" : "text-lg"}`}
            style={{ animationDelay: `${200 + i * 260}ms` }}
          >
            {paragraph}
          </p>
        ))}
      </div>

      <footer className="relative mt-10 mb-6 flex items-end justify-between gap-4 border-t-2 border-ink/15 pt-6">
        <div>
          <p className="text-lg">With pride,</p>
          <p className="text-3xl font-extrabold">Cell</p>
          <div aria-hidden className="mt-2 flex gap-1">
            {HEAT.slice(1).map((colour) => (
              <span key={colour} className="size-3 rounded-[2px]" style={{ background: colour }} />
            ))}
          </div>
          <p className="mt-2 text-base text-ink-soft">your WrapYourGit guide</p>
        </div>
        <p className="text-base text-ink-soft">{data.meta.periodEnd}</p>
      </footer>
    </article>
  );
}
