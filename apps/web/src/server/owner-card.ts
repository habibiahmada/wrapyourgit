import { toPublicRecap } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";

/**
 * The owner gets two summary cards (/api/card), because a card is made to be posted:
 *
 * - the share card: the public recap's card, the same image as their /<login> link preview, so
 *   no private contribution is counted (AGENTS.md rule 6);
 * - the card with private work (`?with=private`): their own numbers, which count private work.
 *   Private repository names stay hidden (toPublicRecap), and `includesPrivate` puts a line on
 *   the card whenever there was private work to count. The owner picks it explicitly, each time.
 */
export type CardKind = "public" | "private";

export function cardKind(withParam: string | null): CardKind {
  return withParam === "private" ? "private" : "public";
}

export function privateCard(data: RecapData): { data: RecapData; includesPrivate: boolean } {
  const { privateCount } = data.contributions;
  return {
    data: toPublicRecap(data),
    includesPrivate: privateCount.status === "ok" && privateCount.value > 0,
  };
}
