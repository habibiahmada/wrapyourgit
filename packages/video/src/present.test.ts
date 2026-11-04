import { describe, expect, test } from "bun:test";
import { metricValue, repoLabel } from "./present";

describe("repoLabel", () => {
  test("public repos show name and owner", () => {
    expect(repoLabel({ nameWithOwner: "octo/trailmix", isPrivate: false })).toEqual({
      name: "trailmix",
      owner: "octo",
    });
  });

  test("private repos are never named", () => {
    const label = repoLabel({ nameWithOwner: "octo/secret-client", isPrivate: true });
    expect(label).toEqual({ name: "Private repository", owner: null });
    expect(JSON.stringify(label)).not.toContain("secret-client");
  });
});

describe("metricValue", () => {
  const fmt = (n: number) => n.toLocaleString("en-US");

  test("plain values pass through", () => {
    expect(metricValue({ status: "ok", value: 1204, estimated: false }, fmt)).toEqual({
      text: "1,204",
      estimated: false,
    });
  });

  test("estimates are marked with ~", () => {
    expect(metricValue({ status: "ok", value: 51, estimated: true }, fmt)?.text).toBe("~51");
  });

  test("unavailable skips the beat instead of showing 0", () => {
    expect(metricValue({ status: "unavailable", reason: "no access" }, fmt)).toBeNull();
  });
});
