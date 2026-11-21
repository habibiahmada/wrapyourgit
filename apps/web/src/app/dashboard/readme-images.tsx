"use client";

import { useId, useRef, useState } from "react";
import {
  BADGE_SHOWS,
  type BadgeShow,
  type CardLayout,
  type CardSide,
  MAX_SHOWS,
} from "@/badge/options";
import { imagePath, type ReadmeChoice, readmeSnippet } from "@/badge/snippet";
import { button } from "@/components/ui";

type Kind = ReadmeChoice["kind"];

const KINDS: { kind: Kind; label: string }[] = [
  { kind: "badge", label: "Badge" },
  { kind: "card", label: "Card" },
  { kind: "snake", label: "Snake" },
];

const SHOW_LABELS: Record<BadgeShow, string> = {
  contributions: "Contributions",
  streak: "Longest streak",
  days: "Active days",
  language: "Top language",
  archetype: "Archetype",
};

const field = "flex min-h-11 items-center gap-3";
const box = "size-5 shrink-0 accent-[#1d7a3a]";
const legend = "mb-1 text-sm font-semibold";

/**
 * Picks a README image and its options, shows it as GitHub will (the real image, from the public
 * recap), and copies the snippet. Built from the public recap, so private work is never in it.
 */
export function ReadmeImages({
  site,
  login,
  year,
  hidden,
}: {
  site: string;
  login: string;
  year: number;
  /** The owner hid their public recap: every image is the neutral one until they show it again. */
  hidden: boolean;
}) {
  const id = useId();
  const [kind, setKind] = useState<Kind>("badge");
  const [shows, setShows] = useState<BadgeShow[]>(["contributions"]);
  const [layout, setLayout] = useState<CardLayout>("wide");
  const [side, setSide] = useState<CardSide>("left");
  const [parts, setParts] = useState({ archetype: true, name: true, stats: true, graph: false });
  const [phoneSwitch, setPhoneSwitch] = useState(false);
  const [status, setStatus] = useState("");
  // The preview that failed to load, so changing an option tries again.
  const [failed, setFailed] = useState<string | null>(null);
  const snippetRef = useRef<HTMLTextAreaElement>(null);

  const choice: ReadmeChoice =
    kind === "badge"
      ? { kind, shows }
      : kind === "card"
        ? { kind, layout, side, ...parts, phoneSwitch }
        : { kind };
  const preview = imagePath(login, choice);
  const snippet = readmeSnippet(site, login, year, choice);

  const toggleShow = (show: BadgeShow) => {
    setStatus("");
    setShows((current) =>
      current.includes(show) ? current.filter((s) => s !== show) : [...current, show],
    );
  };
  const setPart = (part: keyof typeof parts, on: boolean) => {
    setStatus("");
    setParts((current) => ({ ...current, [part]: on }));
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet.text);
      setStatus("Copied. Paste it into your profile README.");
    } catch {
      // No clipboard access (an old browser, a denied permission): select it for a manual copy.
      snippetRef.current?.select();
      setStatus("Your browser didn't allow copying. The snippet is selected: press Ctrl+C or ⌘C.");
    }
  }

  return (
    <div className="grid gap-6 px-4 py-4 md:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="grid content-start gap-5">
        <fieldset>
          <legend className={legend}>Image</legend>
          {KINDS.map((option) => (
            <label key={option.kind} className={field}>
              <input
                type="radio"
                name={`${id}-kind`}
                className={box}
                checked={kind === option.kind}
                onChange={() => {
                  setKind(option.kind);
                  setStatus("");
                }}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {kind === "badge" && (
          <fieldset aria-describedby={`${id}-shows-note`}>
            <legend className={legend}>Values</legend>
            <p id={`${id}-shows-note`} className="mb-1 text-sm text-muted">
              Up to {MAX_SHOWS}, in the order you tick them.
            </p>
            {BADGE_SHOWS.map((show) => {
              const position = shows.indexOf(show);
              const full = position === -1 && shows.length >= MAX_SHOWS;
              return (
                <label key={show} className={`${field} ${full ? "text-muted" : ""}`}>
                  <input
                    type="checkbox"
                    className={box}
                    checked={position !== -1}
                    disabled={full}
                    onChange={() => toggleShow(show)}
                  />
                  <span>
                    {SHOW_LABELS[show]}
                    {position !== -1 && shows.length > 1 && (
                      <span className="text-muted"> ({position + 1})</span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {kind === "card" && (
          <>
            <fieldset>
              <legend className={legend}>Layout</legend>
              {(["wide", "compact"] as const).map((value) => (
                <label key={value} className={field}>
                  <input
                    type="radio"
                    name={`${id}-layout`}
                    className={box}
                    checked={layout === value}
                    onChange={() => setLayout(value)}
                  />
                  {value === "wide" ? "Wide" : "Compact, for phones"}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className={legend}>Show</legend>
              {(
                [
                  ["archetype", "Archetype", false],
                  ["name", "Archetype name", !parts.archetype],
                  ["stats", "Numbers", false],
                  ["graph", "Graph", false],
                ] as const
              ).map(([part, label, off]) => (
                <label key={part} className={`${field} ${off ? "text-muted" : ""}`}>
                  <input
                    type="checkbox"
                    className={box}
                    checked={parts[part] && !off}
                    disabled={off}
                    onChange={(event) => setPart(part, event.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {layout === "wide" && (
              <>
                <fieldset disabled={!parts.archetype}>
                  <legend className={`${legend} ${parts.archetype ? "" : "text-muted"}`}>
                    Archetype side
                  </legend>
                  {(["left", "right"] as const).map((value) => (
                    <label
                      key={value}
                      className={`${field} ${parts.archetype ? "" : "text-muted"}`}
                    >
                      <input
                        type="radio"
                        name={`${id}-side`}
                        className={box}
                        checked={side === value}
                        onChange={() => setSide(value)}
                      />
                      {value === "left" ? "Left" : "Right"}
                    </label>
                  ))}
                </fieldset>
                <label className={field}>
                  <input
                    type="checkbox"
                    className={box}
                    checked={phoneSwitch}
                    onChange={(event) => setPhoneSwitch(event.target.checked)}
                  />
                  Switch to the compact card on phones
                </label>
              </>
            )}
          </>
        )}

        {kind === "snake" && (
          <p className="text-sm text-muted">
            A snake eats your {year} graph and grows as it goes. It keeps looping while the README
            is open; readers who turn on reduced motion see the graph still.
          </p>
        )}
      </div>

      <div className="grid min-w-0 content-start gap-4">
        {hidden && (
          <p role="status" className="rounded-md border border-line bg-overlay px-4 py-3 text-sm">
            Your public recap is hidden, so these images only say &ldquo;See the {year}{" "}
            recap&rdquo;. <a href="/settings">Show it again in Settings</a> to put your numbers in
            them.
          </p>
        )}
        <div className="overflow-x-auto rounded-md border border-line bg-head p-4">
          {failed === preview ? (
            <p className="text-sm text-muted">
              The preview didn&apos;t load. The snippet still works; try reloading the page.
            </p>
          ) : (
            // biome-ignore lint/performance/noImgElement: the real SVG as a README shows it; next/image would re-encode it
            <img
              key={preview}
              src={preview}
              alt={`Preview: ${snippet.format === "html" ? "the card" : `the ${kind}`} as it shows in a README`}
              className="block max-w-none"
              onError={() => setFailed(preview)}
            />
          )}
        </div>
        <p className="text-sm text-muted">
          Built from your public recap, like your share link: private work isn&apos;t counted.
          {snippet.format === "html" &&
            " On phones, GitHub may keep showing the wide card; that part isn't checked on GitHub yet."}
        </p>
        <div className="grid gap-2">
          <label htmlFor={`${id}-snippet`} className="text-sm font-semibold">
            {snippet.format === "html" ? "HTML" : "Markdown"} for your README
          </label>
          <textarea
            id={`${id}-snippet`}
            ref={snippetRef}
            readOnly
            value={snippet.text}
            rows={snippet.format === "html" ? 6 : 3}
            spellCheck={false}
            className="w-full resize-none rounded-[var(--radius-control)] border border-line bg-head p-3 font-mono text-sm text-fg"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={button.secondary} onClick={copy}>
              Copy {snippet.format === "html" ? "HTML" : "Markdown"}
            </button>
            <p role="status" aria-live="polite" className="text-sm text-muted">
              {status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
