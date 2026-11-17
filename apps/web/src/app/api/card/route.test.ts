import { beforeEach, describe, expect, mock, test } from "bun:test";
import { sampleRecap } from "@wyg/video";

const calls: string[] = [];
let publicKind = "recap";

mock.module("@/server/auth", () => ({
  getCurrentUser: async () => ({ id: "user-1", login: "Octo_Cat" }),
}));
mock.module("@/server/recaps", () => ({
  getRecap: async () => ({ data: sampleRecap, syncedAt: new Date("2026-11-01T00:00:00Z") }),
}));
mock.module("@/server/card", () => ({
  cardPng: async () => {
    calls.push("private");
    return new Uint8Array([1]);
  },
  publicCardPng: async () => {
    calls.push("public");
    return new Uint8Array([2]);
  },
}));
mock.module("@/server/public-recaps", () => ({
  lookupKey: () => "key",
  loadPublicRecap: async () =>
    publicKind === "recap"
      ? { kind: "recap", login: "Octo_Cat", data: sampleRecap }
      : { kind: publicKind, login: "Octo_Cat" },
}));

const { GET } = await import("./route");
const card = (query = "") => GET(new Request(`https://wyg.test/api/card${query}`));

beforeEach(() => {
  calls.length = 0;
  publicKind = "recap";
});

describe("GET /api/card", () => {
  test("the default download is the share card, built from the public recap", async () => {
    const response = await card();
    expect(response.status).toBe(200);
    expect(calls).toEqual(["public"]);
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="wrapyourgit-${sampleRecap.meta.year}-octo-cat.png"`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  test("only an exact ?with=private gives the card that counts private work", async () => {
    const response = await card("?with=private");
    expect(calls).toEqual(["private"]);
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="wrapyourgit-${sampleRecap.meta.year}-octo-cat-with-private.png"`,
    );
    for (const query of ["?with=Private", "?with=1", "?private=1"]) {
      calls.length = 0;
      await card(query);
      expect(calls).toEqual(["public"]);
    }
  });

  test("a hidden or busy public recap never falls back to the private numbers", async () => {
    publicKind = "hidden";
    expect((await card()).status).toBe(409);
    publicKind = "busy";
    expect((await card()).status).toBe(503);
    expect(calls).toEqual([]);
  });
});
