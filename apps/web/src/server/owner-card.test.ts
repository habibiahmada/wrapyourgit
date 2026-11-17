import { describe, expect, test } from "bun:test";
import { PRIVATE_REPO_NAME, type RecapData } from "@wyg/schema";
import { sampleRecap } from "@wyg/video";
import { cardKind, privateCard } from "./owner-card";

const withPrivate = (value: number): RecapData => ({
  ...sampleRecap,
  contributions: {
    ...sampleRecap.contributions,
    privateCount: { status: "ok", value, estimated: false },
  },
});

describe("cardKind", () => {
  test("only an explicit ?with=private asks for the card that counts private work", () => {
    expect(cardKind("private")).toBe("private");
    expect(cardKind(null)).toBe("public");
    expect(cardKind("")).toBe("public");
    expect(cardKind("Private")).toBe("public");
    expect(cardKind("public")).toBe("public");
  });
});

describe("privateCard", () => {
  test("keeps the owner's own numbers and labels them when private work was counted", () => {
    const card = privateCard(withPrivate(120));
    expect(card.includesPrivate).toBe(true);
    expect(card.data.contributions.total).toBe(sampleRecap.contributions.total);
  });

  test("no label when there was no private work to count", () => {
    expect(privateCard(withPrivate(0)).includesPrivate).toBe(false);
  });

  test("still never names a private repository", () => {
    const [first, ...rest] = sampleRecap.repositories.top;
    if (!first) throw new Error("sample has no repositories");
    const secret = { ...first, nameWithOwner: "octo/secret-client", isPrivate: true };
    const data: RecapData = {
      ...withPrivate(120),
      repositories: { ...sampleRecap.repositories, top: [secret, ...rest] },
    };
    const names = privateCard(data).data.repositories.top.map((repo) => repo.nameWithOwner);
    expect(names).not.toContain("octo/secret-client");
    expect(names).toContain(PRIVATE_REPO_NAME);
  });
});
