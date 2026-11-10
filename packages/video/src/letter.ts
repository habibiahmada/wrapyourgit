import type { ArchetypeId, RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "./copy";
import { isAnonymised, letterRepo, repoLabel, runnerUps } from "./present";

/*
 * The congratulations letter at the end of the story. It reads like a note from a friend, not a
 * report: a few anchoring facts woven into encouraging sentences whose tone follows how active the
 * year was. Every fact comes from the recap and is dropped when it is zero or unavailable (R-38).
 * Phrasing varies between people (seeded by login) but stays the same for one person. Shared by
 * the web story, the PNG slides and the PDF.
 */

export interface Letter {
  greeting: string;
  paragraphs: string[];
  signOff: string;
}

export type ActivityTier = "blank" | "quiet" | "steady" | "busy" | "relentless";

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
const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
const n = (value: number) => value.toLocaleString("en-US");
/** Small counts read better as words in a letter: "nine languages", not "9 languages". */
const count = (value: number) => WORDS[value] ?? n(value);
const withArticle = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;

/** How often the person showed up, as a share of the days in the period so far. */
export function activityTier(recap: RecapData): ActivityTier {
  const { activeDays, total, calendar } = recap.contributions;
  if (total === 0 || activeDays === 0) return "blank";
  const share = activeDays / Math.max(calendar.length, 1);
  if (share < 0.1 || total < 50) return "quiet";
  if (share < 0.3) return "steady";
  if (share < 0.6) return "busy";
  return "relentless";
}

/** Stable per person, different between people: picks one phrasing from a list. */
function picker(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let state = h >>> 0;
  return <T>(options: readonly T[]): T => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return options[state % options.length] as T;
  };
}

export const OPENINGS: Record<ActivityTier, readonly string[]> = {
  blank: [
    "Some years are for building, and some years are for getting ready to build. This one was quiet on GitHub, and that is completely fine.",
    "Not every year leaves a trail of green squares. Sometimes the work happens somewhere else: in learning, in planning, in living. That counts too.",
  ],
  quiet: [
    "This was a quiet year on GitHub, and quiet is not the same as nothing. Every one of those commits was a choice to show up when it would have been easier not to.",
    "Your year had a quieter rhythm. A few sessions here, a few there, and each of them moved something forward. Small steps are still steps.",
  ],
  steady: [
    "You found a rhythm this year. Not every day, not every week, but often enough that the work kept moving, and that is how real things get made.",
    "There is something steady about the way you worked this year. You kept coming back, and coming back is most of the job.",
  ],
  busy: [
    "What a year. You showed up again and again, and your graph is the proof: green spreading across the months like a city being built.",
    "You were busy this year in the best way. Ideas became branches, branches became commits, and commits became things that exist now.",
  ],
  relentless: [
    "You barely stopped this year. Day after day the squares lit up, and it is hard to look at your graph without feeling the momentum in it.",
    "This was a year of showing up almost every single day. That kind of consistency is rare, and you made it look normal.",
  ],
};

const CLOSINGS: Record<ActivityTier, readonly string[]> = {
  blank: [
    "Whenever you are ready, the first commit is waiting, and we would love to tell that story next year.",
    "Start small, start anywhere. Next year's recap begins with whatever you push next.",
  ],
  quiet: [
    "Next year, try for one more session a month than this year. You will be surprised how far that goes.",
    "Keep going at your own pace. The green squares add up faster than you think.",
  ],
  steady: [
    "Keep protecting that rhythm. A steady pace beats a burst every time.",
    "If you want a challenge for next year, try a slightly longer streak. You already know you can keep coming back.",
  ],
  busy: [
    "Keep building, and remember to celebrate what you ship, not just what is next.",
    "Take a breath and look back at everything that exists because of you this year. Then go make next year even better.",
  ],
  relentless: [
    "Be proud, and also be kind to yourself: rest is part of the work. Take a breather when you need it, then keep the momentum.",
    "Remember to pace yourself. The best builders are still building years from now, so breathe, rest, and keep going.",
  ],
};

const MEANINGS: Record<ArchetypeId, string> = {
  builder:
    "Builders make things that did not exist before, and the world is a little bigger because of what you started.",
  consistent:
    "Consistency is a quiet superpower. Showing up day after day is what turns plans into finished work.",
  explorer:
    "Explorers keep the craft alive. Every new language you touched taught you a new way to think.",
  collaborator:
    "Collaborators make everyone around them better. Your reviews and pull requests helped other people's work land.",
  "night-owl":
    "Night owls do some of their best thinking when the world goes quiet. Just remember the sunrise is nice too.",
  "open-sourcer":
    "Open sourcers make the commons richer. Code you shared with people you have never met is now helping them.",
};

export function congratsLetter(recap: RecapData): Letter {
  const { contributions, languages, community, identity, profile, meta } = recap;
  const tier = activityTier(recap);
  const pick = picker(`${profile.login}-${meta.year}`);
  const soFar = meta.isFinal ? "" : " so far";
  const paragraphs: string[] = [pick(OPENINGS[tier])];

  // A moment from the year, told as a scene rather than a statistic.
  if (tier !== "blank") {
    const moment: string[] = [];
    if (contributions.busiestMonth && contributions.busiestMonth.count > 0) {
      moment.push(
        `${MONTHS[contributions.busiestMonth.month - 1]} was when everything came together: your busiest month, the one where the ideas would not wait.`,
      );
    }
    if (contributions.longestStreak.days >= 7) {
      moment.push(
        `At one point you kept a streak going for ${n(contributions.longestStreak.days)} days in a row. Think about how many reasons there were to skip a day, and how you didn't.`,
      );
    } else if (contributions.longestStreak.days > 1) {
      moment.push(
        "You strung together a few days in a row more than once, and each run made the next one easier.",
      );
    }
    const maxDay = Math.max(...contributions.weekday);
    if (maxDay > 0)
      moment.push(`${WEEKDAYS[contributions.weekday.indexOf(maxDay)]}s were clearly your day.`);
    if (moment.length > 0) paragraphs.push(moment.join(" "));
  }

  // The craft: what they worked in and on, as a story.
  const craft: string[] = [];
  const top = languages.top[0];
  if (top) {
    const others = languages.distinctCount - 1;
    craft.push(
      others > 0
        ? `${top.name} was home this year, but you wandered into ${count(others)} other ${others === 1 ? "language" : "languages"} too, and every one of them left you with a new trick.`
        : `${top.name} was home this year, and you went deep instead of wide.`,
    );
  }
  const repo = letterRepo(recap);
  if (repo) {
    craft.push(
      // Named even when private when the owner chose to show it (ADR-0017). An anonymised one is
      // still the year's main repository, so the letter says so without its name.
      isAnonymised(repo)
        ? "One private project got more of your attention than anything else, and whatever it is, it is better for it."
        : `The ${repoLabel(repo).name} repository got more of your time than anything else, and it shows.`,
    );
  }
  if (community.starsGained.status === "ok" && community.starsGained.value > 0) {
    craft.push(
      "People noticed, too: your work picked up new stars from developers who found it useful.",
    );
  }
  if (craft.length > 0) paragraphs.push(craft.join(" "));

  // Identity: who all of that adds up to, plus the archetypes they also brushed against.
  if (identity.archetype) {
    const others = runnerUps(identity).map((id) => ARCHETYPE_LABELS[id]);
    const also =
      others.length > 0
        ? ` You are also part ${others.join(" and part ")}, which makes you hard to put in one box.`
        : "";
    paragraphs.push(
      `Put it all together and you are ${withArticle(ARCHETYPE_LABELS[identity.archetype])}. ${MEANINGS[identity.archetype]}${also}`,
    );
  } else {
    paragraphs.push(
      "Your story is just beginning, and the next chapter starts the moment you push your next commit. There is no wrong way to start.",
    );
  }

  if (tier !== "blank") {
    paragraphs.push(
      `All in all, that is ${n(contributions.total)} contributions in ${meta.year}${soFar}. Each one was a small decision to make something, and together they are your year.`,
    );
  }
  paragraphs.push(pick(CLOSINGS[tier]));

  return {
    greeting: `Dear ${profile.name ?? `@${profile.login}`},`,
    paragraphs,
    signOff: "With pride, Cell, your WrapYourGit guide",
  };
}
