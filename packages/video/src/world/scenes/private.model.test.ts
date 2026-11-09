import { expect, test } from "bun:test";
import { sampleRecap } from "../../fixtures/sample-recap";
import { privateModel } from "./private.model";

const withPrivate = (privateCount: (typeof sampleRecap.contributions)["privateCount"]) => ({
  ...sampleRecap,
  contributions: { ...sampleRecap.contributions, privateCount },
});

test("privateModel: a count", () => {
  expect(privateModel(sampleRecap)).toEqual({ kind: "count", count: 210, estimated: false });
});

test("privateModel: an estimated count says so", () => {
  expect(privateModel(withPrivate({ status: "ok", value: 12, estimated: true }))).toEqual({
    kind: "count",
    count: 12,
    estimated: true,
  });
});

test("privateModel: zero is none", () => {
  expect(privateModel(withPrivate({ status: "ok", value: 0, estimated: false }))).toEqual({
    kind: "none",
  });
});

test("privateModel: unavailable is not zero", () => {
  expect(privateModel(withPrivate({ status: "unavailable", reason: "no scope" }))).toEqual({
    kind: "unavailable",
  });
});
