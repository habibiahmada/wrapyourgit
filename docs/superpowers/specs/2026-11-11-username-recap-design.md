# Recap for any GitHub username: design

Date: 2026-11-11. Status: draft for the maintainer's approval, updated with the answers to the builder check.

## Intent

Anyone should get a recap by typing a GitHub username, the way GitHub Unwrapped works: type a name, wait a moment, and the story plays. Signing in should feel the same, just with more data: sign in, wait, watch. Today both are slow to reach. A visitor can't get a recap at all without the owner publishing it, and a signed-in user clicks through the dashboard, "Build my recap", "Play your story" and several redirects before the story starts. The maintainer finds that UX "not simple: too many redirects and clicks".

## Goals

1. **One address per person: `/<username>`** (for example `/habibiahmada`). Everyone uses it.
2. **Visitors see the public recap.** Anyone, signed in or not, opening someone else's `/<username>` sees a recap built only from what GitHub shows publicly about that account.
3. **The owner sees more at the same address.** When the signed-in user opens their own `/<username>`, they see their full recap (private contribution counts, and private repository names per their choice, ADR-0017).
4. **Straight to the story.** Username → loading → story. Sign in → loading → story. No "Build my recap" or "Play your story" step in between.
5. **Visitors can share and export the public recap**: MP4, slides (PNG, ZIP), PDF and the share card, all from the public data.
6. **After the story:** visitors land on the export and share screen; the owner continues to the dashboard.

## Non-goals

- Sign-in with organisation access (the next project in the story-world spec).
- Changing the story world's scenes, the analytics or the metrics.
- A queue or background workers (approach 2 below).

## Anti-goals (a failure even if it works)

- **A visitor learns something the owner hasn't made public on GitHub.** That includes private contribution counts the owner hides on their GitHub profile, private repository names or details, and their timezone or commit hours (`toPublicRecap` already withholds the last two).
- **Numbers that differ from GitHub without saying so.** The public recap is smaller than the owner's full one by nature; the story must label it, for example "Public activity only", so nobody reads a smaller total as wrong.
- **The server's GitHub quota running out** because the same username is fetched again and again, or because one person scripts thousands of lookups.
- **A GitHub user whose name collides with a site route** (`settings`, `privacy`, `api`, ...) taking over or breaking that route.
- **Long, unexplained waits.** If a fetch takes ~20 s, the loading screen says what is happening; if it fails, it says why and offers a retry.

## Constraints

- AGENTS.md rules. Rule 5: GitHub tokens stay on the server. Rule 6 / ADR-0017: every surface a visitor sees renders the public projection.
- Next.js 16 App Router with Cache Components, on Vercel Hobby (no long-running workers, function time limits), Neon Postgres, production-only deploys (ADR-0018).
- GitHub GraphQL rate limit: 5,000 points per hour per token. The story world, its exports and the player already exist and stay as they are.
- WCAG 2.2 AA and the antislop Hard Gate for the new pages (landing form, loading screen, end screen).

## Approaches

1. **Fetch on visit, store in the database** _(chosen by the maintainer)_. `/<username>` serves a stored public recap when it is fresh, and otherwise fetches it with a server token while the visitor sees the loading screen. Reuses the existing fetch → analytics → schema pipeline and fits Vercel.
2. **A background queue.** Requests are queued, a worker fetches, the page polls. Holds up better under bursts, but needs an always-on worker that Vercel Hobby doesn't offer. Not chosen.
3. **Fetch from the visitor's browser.** Ruled out: it breaks rule 5, and unauthenticated GitHub allows 60 requests an hour, fewer than one recap needs.

## The design, as decided with the maintainer

### Addresses

- `/<username>` is the recap. Case-insensitive; it redirects to GitHub's canonical casing.
- `/u/<login>` and `/recap` redirect to `/<username>` (the signed-in user's own name for `/recap`), so old links keep working.
- The "Publish my recap page" switch and the `recap_shares` opt-in go away: every username has a public recap unless its owner hides it (below).
- Site routes win over usernames. A GitHub account whose name is a reserved route still has a recap at `/u/<name>` _(my call: the only fallback that keeps both working)_.

### What each viewer sees

| Viewer                                                                                   | Data                                                                                                                    | After the story                                                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Anyone opening someone else's `/<username>` (signed out, or signed in as another person) | The **public recap**: fetched with a server token, so it contains only what GitHub shows publicly, then `toPublicRecap` | End screen: MP4 / slides / PDF / share card, plus "Make your own" and "Sign in for your full recap" |
| The owner, signed in, on their own `/<username>`                                         | Their **full recap** (their own token), private names per their choice                                                  | Keep-your-year screen, then the dashboard                                                           |

- **Visitors never see the owner's full recap, even projected** _(my call)_. The owner's full recap counts private contributions that the owner may hide on their GitHub profile; projecting it would publish those counts. The public recap is always fetched as an outsider would see it.
- The story labels the public recap, for example "Public activity only" at the first stop or on the counts that can differ _(wording left to the builder)_.

### Owner flow

1. Sign in with GitHub.
2. Straight to their own `/<username>`. If their recap is missing or stale, the sync starts by itself behind the loading screen; no "Build my recap" button.
3. The private-names question still appears once, before the first story (maintainer's decision), then the story plays.
4. After the story: the existing "Keep your year" screen, then the dashboard (sync again, downloads, Settings).

### Visitor flow

1. The landing page leads with one field: a GitHub username, and a button to make the recap.
2. `/<username>`: if a fresh public recap is stored, the story starts right away; otherwise the loading screen shows while it is fetched (about 20 s the first time).
3. The story plays from the public recap.
4. The end screen offers the exports and the share card.

### Owners can hide their public recap

Decided after the builder check (the only users today are the maintainer and their own accounts, so the change of rules needs no migration):

- Settings gets a switch, "Hide my public recap". While it is on, nobody else sees a recap at `/<username>`: the server doesn't fetch that account, and visitors get "@x has hidden their recap". The owner still sees their own full recap there.
- Deleting the account ("Delete my data") also hides the public recap and removes any stored public recap, so the promise that deleting removes the recap stays true.
- Hidden accounts are remembered by GitHub user id, so a renamed login stays hidden.
- The privacy page, the landing FAQ and a new ADR say all this: public GitHub activity is visible to anyone at `/<username>` unless the owner hides it; private data never is.

### Fetching and storing public recaps

- **Server token (maintainer's decision):** a fine-grained personal access token limited to **public repositories (read-only)**, created on **one machine account** (GitHub allows one machine account for automation). It cannot see any private repository, so a public recap can never count contributions to private repos the token's owner could see. It is a server-only secret (rule 5) and expires; the deployment guide gets a renewal step.
- **No token pool.** Spreading requests over several personal accounts to get more quota breaks GitHub's terms (circumventing rate limits, one free account per person), so the design stays within one token.
- **Saving quota instead:**
  - a stored public recap is served for 12 hours _(my call)_; after that the next visit refetches;
  - last year's comparison doesn't change any more, so it is fetched once per account and kept;
  - only one fetch per username runs at a time; concurrent visitors wait for the same fetch;
  - a per-client limit on new usernames per hour _(number left to the builder)_.
- **When the quota runs low:** new usernames get "The server is busy, try again in a few minutes", while stored recaps keep playing. The server reads the remaining quota from GitHub's rate-limit response and stops starting new fetches before it reaches zero.
- **Capacity:** with 5,000 points an hour and roughly 25 requests per new recap, about 150-200 new usernames an hour; usernames already stored cost nothing.
- **Storage:** public recaps are stored separately from owners' full recaps, keyed by GitHub user id (logins can be renamed), with the time they were fetched. The GraphQL queries ask for `user(login:)` instead of `viewer`.

### Edge cases

- **The username doesn't exist on GitHub:** a "No GitHub user called @x" page with the field to try again.
- **The account exists but has no activity this year:** the honest quiet-year recap the story already handles.
- **Organisation accounts** (not users): a clear "That's an organisation; recaps are for people" message _(my call)_.
- **A fetch fails or times out:** the loading screen turns into an error with a retry; nothing half-built is stored.

## Left to the builder

- The per-client rate-limit number, and the quota threshold at which new fetches stop.
- The wording of the "public activity only" label and the end-screen copy.
- How the loading screen learns the fetch finished (streaming or polling) within Vercel's function time limit.
- Which reserved route names to list.
- The ADR that records this (it amends ADR-0017's "public page", replaces the opt-in sharing, and records the token choice and the no-pool rule).
