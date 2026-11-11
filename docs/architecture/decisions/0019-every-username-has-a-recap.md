# 0019. Every GitHub username has a recap

- Status: Accepted
- Date: 2026-11-11
- Amends: [0017](0017-private-names-follow-the-owner.md) rule 1 (the public page)
- Replaces: the opt-in sharing of M5 (`recap_shares`, "Publish my recap page")

## Context

Until now a visitor could see a recap only after its owner signed in, synced and pressed "Publish my recap page" on the dashboard; the page then lived at `/u/<login>`. Nobody could make a recap of someone else, and the owner clicked through the dashboard, "Build my recap" and "Play your story" before anything played. The design for username recaps (`docs/superpowers/specs/2026-11-11-username-recap-design.md`) asks for one address per person, `/<username>`, that anyone can open, the way GitHub's own profile is open.

A visitor must still learn nothing the owner hasn't made public on GitHub. The owner's stored recap is built with their own token and counts private contributions, which the owner may hide on their GitHub profile. Projecting it with `toPublicRecap` removes names but keeps those counts, so it can't be what a visitor sees.

Reading any account needs a GitHub token on the server. GitHub's GraphQL API gives a token 5,000 points an hour, and a new recap costs about 25 requests.

## Decision

1. **Every username has a recap at `/<username>`.** The signed-in owner on their own address sees their full recap, as before (private names per ADR-0017). Everyone else sees the **public recap**: fetched as an outsider would see the account, built with `meta.scope = "public"`, then stored and served as `toPublicRecap()` of it. Visitors never see a projection of the owner's full recap. The story labels it "Public activity only".
2. **This amends ADR-0017 rule 1.** "The public page" is now `/<username>` (or `/u/<login>` for a login that collides with a site route), and its data is the public fetch, not the owner's recap. Visitors can now export the public recap (MP4, slides, PDF and the share card), without the letter. Everything else in rule 1 holds: every public surface (the page, the story played on it, its card and OG image, the visitor's files) renders the public projection and never names a private repository.
3. **Opt-in sharing goes away.** The dashboard's Share section, the "Publish" action, `isShared`/`setShared`, the old `getPublicRecap` and the `recap_shares` table are removed (migration 0007). `/u/<login>` redirects (308) to `/<login>` and `/recap` to the signed-in user's own address.
4. **The public token is one fine-grained personal access token on one machine account**, limited to "public repositories (read-only)", in the server-only variable `GITHUB_PUBLIC_TOKEN` (AGENTS.md rule 5). It can't see any private repository, so a public recap can never count private work the token's owner happens to have access to. GitHub allows one machine account for automation. The token expires; the deployment guide has the renewal step.
5. **No token pool.** Spreading lookups across several accounts to get more quota would circumvent GitHub's rate limits and its one-free-account-per-person rule, which its terms forbid. The design stays within one token and saves quota instead:
   - a stored public recap is served for 12 hours before the next visit fetches it again;
   - last year's raw activity, for the comparison, is fetched once per account and kept until its span is complete;
   - one request fetches an account at a time; concurrent visitors wait for that fetch;
   - a client may start 20 new lookups an hour, counted by a salted hash of its address, never the address;
   - new fetches stop while GitHub reports fewer than 300 points left. Stored recaps keep playing; a visitor asking for a new name gets "The server is busy, try again in a few minutes".
6. **Owners can hide their public recap.** Settings has a "Hide my public recap" switch. While it is on, the server doesn't fetch the account and visitors read "@x has hidden their recap"; the owner still sees their own recap there. Hiding also deletes the stored public recap. The hide list is keyed by GitHub id (`hidden_accounts`), so a renamed login stays hidden. "Delete my data" hides the public recap and deletes the stored one too, so deleting still removes the recap from the site.

## Consequences

- A visitor gets a recap by typing a username on the landing page (a GET form to `/go`, which normalizes the input and redirects); the owner signs in and lands on their story.
- Public GitHub activity is now visible on this site for every account, not only for people who signed in. The privacy page, the landing FAQ and the README say so, and how to hide it.
- Capacity is roughly 150 to 200 new usernames an hour on one token; usernames already stored cost nothing. A burst of new names beyond that waits or gets "busy".
- Accounts named like a site route (`settings`, `privacy`, ...) keep their recap at `/u/<name>`. Routes served with a dot (`/robots.txt`, `/favicon.ico`) need no reservation, because a login has no dots.
- The hide list outlives the account it belongs to. Someone who deletes their data and later wants a public recap again signs in and turns the switch off.

## Alternatives considered

- **Keep opt-in sharing and add username lookups beside it.** Two kinds of public page with different data and rules; the opt-in page would still project the owner's full recap, which the context rules out.
- **A token pool, or each visitor's own token.** The pool breaks GitHub's terms (decision 5). Asking visitors to sign in defeats the point of typing a username. Unauthenticated calls from the browser allow 60 requests an hour, fewer than one recap needs, and moving GitHub calls to the client goes against rule 5.
- **A background queue that fetches while the page polls.** Holds up better under bursts, but needs an always-on worker that the current hosting (ADR-0015) doesn't offer.
