import type { RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "./copy";
import { repoLabel } from "./present";

/*
 * The congratulations letter at the end of the story. Every sentence comes from a real number in
 * the recap and is dropped when that number is zero or unavailable, so the letter never praises
 * something that didn't happen (R-38). Shared by the web story, the PNG slides and the PDF.
 */

export interface Letter {
  greeting: string;
  paragraphs: string[];
  signOff: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const n = (value: number) => value.toLocaleString("en-US");
const plural = (value: number, word: string) => `${n(value)} ${word}${value === 1 ? "" : "s"}`;
const withArticle = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;

export function congratsLetter(recap: RecapData): Letter {
  const { contributions, languages, repositories, community, identity, profile, meta } = recap;
  const soFar = meta.isFinal ? "" : " so far";
  const paragraphs: string[] = [];

  // The year in one breath: volume, presence, persistence.
  if (contributions.total > 0) {
    const sentences = [
      `You made ${plural(contributions.total, "contribution")} in ${meta.year}${soFar}.`,
    ];
    if (contributions.activeDays > 0) {
      sentences.push(`You showed up on ${plural(contributions.activeDays, "day")}.`);
    }
    if (contributions.longestStreak.days > 1) {
      sentences.push(
        `Your longest run lasted ${plural(contributions.longestStreak.days, "day")} in a row, and that takes real discipline.`,
      );
    }
    paragraphs.push(sentences.join(" "));
  }

  // Rhythm: when the work happened.
  const rhythm: string[] = [];
  if (contributions.busiestMonth && contributions.busiestMonth.count > 0) {
    rhythm.push(
      `${MONTHS[contributions.busiestMonth.month - 1]} was your busiest month, with ${plural(contributions.busiestMonth.count, "contribution")}.`,
    );
  }
  const maxDay = Math.max(...contributions.weekday);
  if (maxDay > 0) {
    rhythm.push(`${WEEKDAYS[contributions.weekday.indexOf(maxDay)]}s were your day.`);
  }
  if (rhythm.length > 0) paragraphs.push(rhythm.join(" "));

  // Craft: languages and the project that got the most of you.
  const craft: string[] = [];
  const top = languages.top[0];
  if (top) {
    craft.push(
      languages.distinctCount > 1
        ? `You wrote mostly ${top.name}, with ${n(languages.distinctCount)} languages in the mix.`
        : `You wrote mostly ${top.name}.`,
    );
  }
  const repo = repositories.top[0];
  if (repo && repo.commits > 0) {
    const name = repo.isPrivate ? "One private project" : repoLabel(repo).name;
    craft.push(`${name} got the most of you: ${plural(repo.commits, "commit")}.`);
  }
  if (community.starsGained.status === "ok" && community.starsGained.value > 0) {
    craft.push(
      `People noticed, too: your projects gained ${community.starsGained.estimated ? "at least " : ""}${plural(community.starsGained.value, "star")}.`,
    );
  }
  if (craft.length > 0) paragraphs.push(craft.join(" "));

  // Identity: the climax, or an honest beginning.
  paragraphs.push(
    identity.archetype
      ? `All of that adds up to ${withArticle(ARCHETYPE_LABELS[identity.archetype])}.${identity.reasons[0] ? ` ${identity.reasons[0]}.` : ""}`
      : "Your story is just beginning, and the next chapter starts the moment you push your next commit.",
  );

  paragraphs.push(
    contributions.total > 0
      ? `Be proud of this year. Whatever you build next, it starts from everything you built here.`
      : "We'll be here to tell the story when you write it.",
  );

  return {
    greeting: `Dear ${profile.name ?? `@${profile.login}`},`,
    paragraphs,
    signOff: "With pride, Cell, your WrapYourGit guide",
  };
}
