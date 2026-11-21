import { beforeEach, describe, expect, mock, test } from "bun:test";
import { sampleRecap } from "@wyg/video";

const lookups: { login: string; human: boolean }[] = [];
let kind = "recap";
let fails = false;

mock.module("server-only", () => ({}));
mock.module("./public-recaps", () => ({
  clientKey: () => "client",
  loadPublicRecap: async (login: string, _client: string, human: boolean) => {
    lookups.push({ login, human });
    if (fails) throw new Error("database down");
    return kind === "recap" ? { kind, login, data: sampleRecap } : { kind, login };
  },
}));

const { readmeImage } = await import("./readme-images");
const get = (image: "badge" | "card" | "snake", login: string, query = "") =>
  readmeImage(image, login, new Request(`https://wyg.test/${login}/${image}.svg${query}`));

beforeEach(() => {
  lookups.length = 0;
  kind = "recap";
  fails = false;
});

describe("readmeImage", () => {
  test("serves an SVG of the stored public recap, cached for an hour", async () => {
    const response = await get("badge", "octo-sample");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");
    expect(await response.text()).toContain(">1,284<");
  });

  test("never lets the image start a GitHub fetch", async () => {
    await get("badge", "octo-sample");
    await get("card", "octo-sample");
    await get("snake", "octo-sample");
    expect(lookups.every((lookup) => lookup.human === false)).toBe(true);
  });

  test("hidden, missing, not fetched yet and failed all draw the same neutral image", async () => {
    const neutral: string[] = [];
    for (const answer of ["hidden", "missing", "verify", "busy", "organization"]) {
      kind = answer;
      neutral.push(await (await get("badge", "octo-sample")).text());
    }
    fails = true;
    const failed = await get("badge", "octo-sample");
    expect(failed.status).toBe(200);
    neutral.push(await failed.text());
    expect(new Set(neutral).size).toBe(1);
    expect(neutral[0]).toContain("See the 2026 recap");
  });

  test("an invalid name is neutral without a lookup", async () => {
    const response = await get("badge", "not a login");
    expect(await response.text()).toContain("See the 2026 recap");
    expect(lookups).toHaveLength(0);
  });

  test("passes the query to the image", async () => {
    const badge = await (await get("badge", "octo-sample", "?show=streak,language")).text();
    expect(badge).toContain("longest streak");
    expect(badge).toContain("TypeScript");
    const card = await (await get("card", "octo-sample", "?layout=compact&hide=archetype")).text();
    expect(card).toContain('width="360"');
    expect(card).not.toContain("data:image/webp");
  });
});
