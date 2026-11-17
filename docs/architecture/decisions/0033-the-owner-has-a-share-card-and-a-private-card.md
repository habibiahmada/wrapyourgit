# 0033. The owner has two cards: a share card and one with private work

- Status: Accepted
- Date: 2026-11-17
- Supersedes: the card (`/api/card`) in rule 1 of [0017](0017-private-names-follow-the-owner.md)

## Context

ADR-0017 rule 1 had `/api/card` always render `toPublicRecap(data)` of the owner's recap. That projection hides private repository names but keeps the numbers ("numbers never differ between the projections"), and the owner's recap is built with their own token. So the contribution total, active days, longest streak, calendar and top language on the card all counted private work.

The card is the one file made to be posted. AGENTS.md rule 6 names this case: `toPublicRecap` of the owner's own recap would publish private contribution counts. A security audit on 2026-11-17 flagged it, and the owner's own link preview (`/<login>/opengraph-image`) already showed different, public-only numbers.

## Decision

1. **Two cards, picked per download** (`server/owner-card.ts`). Nothing depends on a stored setting, so an owner never posts private numbers because of a choice made long ago for a different purpose.
2. **The share card** (`/api/card`, the default button): the public recap's card (`loadPublicRecap`, then `publicCardPng`), the same image as the owner's link preview. If the public recap is hidden it is not offered (409); while it is busy or limited the owner is asked to try again (503).
3. **The card with private work** (`/api/card?with=private`, its own button): the owner's own numbers, still through `toPublicRecap` so no private repository is named, with the line "includes private contributions" whenever the owner's private count is above zero. Only an exact `with=private` selects it.
4. **File names** use `cardFileName(year, login)`, slugged like the other exports; the private card adds `-with-private`.

## Alternatives considered

- **Follow `users.show_private_names`.** That question is about naming private repositories in the story, not about publishing counts; reusing it would decide the card for owners who never thought about the card.
- **Only the public card.** The most private, but an owner could not post their full year at all.
- **Keep the owner's numbers and only add a label.** The default download would still publish private counts.

## Consequences

- The default card and the link preview are the same image, so they no longer disagree.
- Posting private numbers takes a deliberate click on a button that says so, and the card itself says so.
- The share card needs the public recap. The first download may start a public fetch, which counts against the owner's lookup limit (ADR-0032).
- `cardPng` (the private card) is cached per user and sync time; `publicCardPng` is keyed by the public data.
