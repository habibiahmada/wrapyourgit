import { describe, expect, test } from "bun:test";
import { toPublicRecap, withoutPrivateNames } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";
import { sampleRecap } from "../fixtures/sample-recap";
import { congratsLetter } from "../letter";
import { drawsPrivateName } from "../present";
import { projectsModel } from "./scenes/projects.model";

// The projection is the only privacy gate (ADR-0017): scenes draw whatever names they are given.
// These pin both sides of it on the two places that name repositories.

const PRIVATE = "client-portal";
const privateRepo = sampleRecap.repositories.top.find((r) => r.isPrivate);
if (privateRepo?.nameWithOwner !== `octo-sample/${PRIVATE}`)
  throw new Error("the sample needs its private repository");

/** The sample with its private repository as the year's top one, so the letter talks about it. */
const privateTop: RecapData = {
  ...sampleRecap,
  repositories: {
    ...sampleRecap.repositories,
    top: [
      { ...privateRepo, commits: 400 },
      ...sampleRecap.repositories.top.filter((r) => r !== privateRepo),
    ],
  },
};

const projectLabels = (data: RecapData) => projectsModel(data).stacks.map((s) => s.label);
const letterText = (data: RecapData) => {
  const letter = congratsLetter(data);
  return [letter.greeting, ...letter.paragraphs, letter.signOff].join("\n");
};

describe("full data (the owner chose to show private names)", () => {
  test("the projects stop names the private repository", () => {
    expect(projectLabels(privateTop)).toContain(PRIVATE);
    expect(projectLabels(privateTop)).not.toContain("Private repository");
  });

  test("the letter names it when it is the top repository", () => {
    expect(letterText(privateTop)).toContain(`The ${PRIVATE} repository`);
    expect(letterText(privateTop)).not.toContain("One private project");
  });
});

describe.each([
  ["withoutPrivateNames (the owner's hidden view)", withoutPrivateNames],
  ["toPublicRecap (every public surface)", toPublicRecap],
])("%s", (_, project) => {
  test("the projects stop keeps the private repository's stack, without its name", () => {
    const { stacks } = projectsModel(project(privateTop));
    expect(stacks[0]).toMatchObject({ label: "Private repository", commits: 400 });
    expect(JSON.stringify(projectsModel(project(privateTop)))).not.toContain(PRIVATE);
  });

  test("the letter credits a private project, not the next public repository", () => {
    const text = letterText(project(privateTop));
    expect(text).toContain("One private project got more of your attention");
    expect(text).not.toContain(PRIVATE);
    for (const r of sampleRecap.repositories.top.filter((r) => !r.isPrivate)) {
      expect(text).not.toContain(`The ${r.nameWithOwner.split("/")[1]} repository`);
    }
  });
});

describe("drawsPrivateName matches what is drawn", () => {
  test("true when the shelf or the letter shows the private name", () => {
    expect(drawsPrivateName(privateTop)).toBe(true);
    expect(drawsPrivateName(sampleRecap)).toBe(true);
    expect(projectLabels(sampleRecap)).toContain(PRIVATE);
  });

  test("false for both projections", () => {
    expect(drawsPrivateName(withoutPrivateNames(privateTop))).toBe(false);
    expect(drawsPrivateName(toPublicRecap(privateTop))).toBe(false);
  });

  test("false for a private repository below the shelf, which no scene names", () => {
    const below: RecapData = {
      ...sampleRecap,
      repositories: {
        ...sampleRecap.repositories,
        top: sampleRecap.repositories.top.map((r) =>
          r === privateRepo ? { ...r, commits: 1 } : r,
        ),
      },
    };
    expect(projectLabels(below)).not.toContain(PRIVATE);
    expect(letterText(below)).not.toContain(PRIVATE);
    expect(drawsPrivateName(below)).toBe(false);
  });
});
