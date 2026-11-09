import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { helloModel } from "./hello.model";

test("helloModel: login and year from the profile", () => {
  expect(helloModel(sampleRecap)).toEqual({ login: "octo-sample", year: 2026 });
});

test("helloModel: an empty year still greets", () => {
  const empty = {
    ...sampleRecap,
    contributions: {
      ...sampleRecap.contributions,
      calendar: sampleRecap.contributions.calendar.map((d) => ({ ...d, count: 0 })),
    },
  };
  expect(helloModel(empty).login).toBe("octo-sample");
});
