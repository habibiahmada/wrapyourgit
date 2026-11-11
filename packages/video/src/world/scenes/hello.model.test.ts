import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { helloModel } from "./hello.model";

test("helloModel: login and year from the profile", () => {
  expect(helloModel(sampleRecap)).toEqual({
    login: "octo-sample",
    year: 2026,
    publicOnly: false,
    scopeLine: null,
  });
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

test("helloModel: public data carries the public-only line", () => {
  const pub = { ...sampleRecap, meta: { ...sampleRecap.meta, scope: "public" as const } };
  const model = helloModel(pub);
  expect(model.publicOnly).toBe(true);
  expect(model.scopeLine).toBe("Public GitHub activity only");
});

test("helloModel: full data has no scope line", () => {
  expect(helloModel(sampleRecap).publicOnly).toBe(false);
  expect(helloModel(sampleRecap).scopeLine).toBeNull();
});
