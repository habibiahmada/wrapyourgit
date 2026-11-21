# 0035. A README badge from the stored public recap

- Status: Accepted
- Date: 2026-11-21

## Context

A recap is watched once and shared once. A GitHub profile README is where developers keep showing their year, and an image there that links to `wrapyourgit.com/<login>` keeps the recap in view. It is also a link to this site from a page people trust, which a new domain has few of.

A README image is not fetched by the person reading the README. GitHub rewrites every image to its proxy, camo, which fetches it from GitHub's own addresses, caches it as the response's `Cache-Control` allows, and gives up after a few seconds. Three things follow from that:

- Camo cannot pass Turnstile, so it is never a person in the sense of [ADR-0026](0026-a-human-check-before-a-new-public-fetch.md), and a public fetch takes 20 to 55 seconds, far past camo's timeout.
- Every README's images come from a small set of shared addresses. The edge rate limit on `/api` and `/u/` (60 requests a minute per IP, deployment guide item 4) would answer a popular README with 429.
- The badge is a public surface: anyone can put any username in the address. AGENTS.md rule 6 applies in full.

## Decision

1. **The address is `/<login>/badge.svg`**, next to the recap it links to, outside `/api` and `/u/` and so outside the edge rate limit. The deployment guide notes that the path must stay outside that rule, and outside the bot rule if it ever moves from log to deny.
2. **Only the stored public recap.** The route calls `loadPublicRecap(login, clientKey(headers), false)`. With `human` false it never asks GitHub: it serves a stored recap that is fresh, or stale within the existing cap (`STALE_SERVE_MS`, seven days), checks `hidden_accounts` by GitHub id, and otherwise answers `verify`. No new path into `public_recaps` and no new limit.
3. **One neutral badge for every other answer.** Hidden, missing, organization, verify, busy, limited and error all get the same image (the mark, "2026", "See the 2026 recap"), with status 200 so camo shows it. The badge never says whether an account is hidden, unknown or simply not fetched yet. A visit to the recap page itself, which the badge links to, is what fetches or refreshes it; the next time camo asks, the badge has numbers.
4. **What a badge may show.** The badge starts with the six-cell mark and the year; the product's name is in the image's accessible name and on the page it links to. Then come the values listed in `?show=`, comma-separated, in that order, each once, at most four (`?show=contributions,streak,language`), each in its own segment. All come from the public projection and none is new to the schema:
   - `contributions` (the default): `contributions.total`
   - `streak`: `contributions.longestStreak.days`
   - `days`: `contributions.activeDays`
   - `language`: `languages.top[0]`, in its GitHub colour
   - `archetype`: the label of `identity.archetype`, which the public share card already shows

   Unknown names are dropped, and an empty list gets the default. A value this recap has nothing for (no top language, no archetype) is left out; with none left the badge is neutral. No `metric()` value is offered until it has a way to say "unavailable" or "estimated" on the badge itself, so `starsGained`, `prsMerged` and the comparison with last year are left out for now.
5. **Honest wording.** While `meta.isFinal` is false the badge ends with "so far", once after the last value ("1,284 contributions | longest streak 24 days so far"). The SVG's `<title>`, which GitHub shows as the image's tooltip, names the user and the recap's `periodEnd`, so a stale badge says how old it is.
6. **The SVG is built as a string on the server**, with no library and no remote font: camo serves it as an `<img>`, which loads nothing, not even an image the SVG points at. Text uses a system font stack and widths from a fixed per-character table. The archetype dioramas travel inside the card as WebP data URLs, cut from the landing page's existing `skin-*` renders by `scripts/badge-art.ts` (about 20 KB each); WebP rather than AVIF because a README shows in GitHub's apps and webviews as well as browsers. Every value written into it is XML-escaped (language names come from GitHub). The response is `image/svg+xml` and carries the site's Content-Security-Policy like any other route, so an SVG opened directly runs nothing.
7. **Caching:** `Cache-Control: public, max-age=3600, s-maxage=3600`. Camo and Vercel's edge keep it an hour, so a badge on a busy profile costs one function call an hour, not one per reader. Hiding the public recap takes up to an hour to reach a badge already cached; the recap page itself stops at once.
8. **One card**, `/<login>/card.svg`, under the same rules: the login, the year's calendar (days not reached yet drawn as outlines), the contribution total, the longest streak and the top language, beside the archetype's diorama and name. Its one option is the side the archetype stands on, `?archetype=left` (the default) or `right`. With no archetype the card is the calendar alone, never a diorama for an archetype the user does not have. The badge stays text: a diorama or character at 28 px reads as a smudge.
9. **A short entrance, once.** The badge's mark lights cell by cell and its values rise into place; the card's weeks come in left to right, then its numbers. Everything starts within 1.6 s and the image then holds still, because an `<img>` can carry no pause control, so nothing loops. It is CSS inside the SVG, wrapped in `prefers-reduced-motion: no-preference`, and the resting state is the final one, so a reader who asks for less motion, or a renderer without CSS animation, sees the whole image at once. Not a GIF: a GIF would be several times heavier, limited to 256 colours with blurred text, and could not honour reduced motion.

## Alternatives considered

- **A shields.io endpoint** (`/api/badge/<login>.json` read by shields.io). Less SVG code, but the badge would depend on a third party's uptime and look, and the JSON would sit under `/api`.
- **Let the badge start a fetch.** Camo would time out before the fetch ended, and anyone could make the server spend the shared token by putting usernames in image tags.
- **Serve any stored recap, however old.** Past the stale cap a row may belong to a login that has since been renamed and reused ([#186](https://github.com/habibiahmada/wrapyourgit/issues/186)); the badge follows the same cap as the page.
- **Only for signed-in owners who turn it on.** Safer, but every username already has a public recap (ADR-0019), and the badge shows nothing that page does not.
- **Render it with Satori, like the share card.** Satori outputs SVG with text as paths, so the badge would be larger and its text unreadable to screen readers and search engines.

## Consequences

- No schema change and no change to `loadPublicRecap`: the badge is a new reader of what is already stored.
- A badge whose recap nobody visits for seven days falls back to the neutral image until someone follows it.
- The numbers on a badge can be up to an hour behind the page, plus however long the stored recap is (12 hours fresh, seven days at most).
- Metrics that can be unavailable or estimated need a badge design of their own before they can be offered.
