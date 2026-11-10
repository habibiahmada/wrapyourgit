# 0017. Private repository names follow the owner in their own story

- Status: Accepted
- Date: 2026-11-10
- Amends: AGENTS.md rule 6 ("Private data never goes public"), [0016](0016-exports-in-the-browser.md) decision 3 (public projection for every file)

## Context

AGENTS.md rule 6 redacted private repository names from everything that could be shared, and ADR-0016 applied it to every exported file: until phase 4, the owner's own story and files always rendered `toPublicRecap(data)`. That hid the owner's own work from the owner. A private repository is often the year's main project, and the person who signed in may want it in their story and in the video they keep, while their public page must still never name it.

`toPublicRecap` also does more than remove names: it sets the timezone to UTC and withholds the commit-hour histogram, because together they hint at where someone lives and when they sleep. Those are the owner's own data, so the owner's hidden view must not lose them; only the public surfaces need that.

## Decision

Two projections in `packages/analytics/src/public.ts`, scenes that draw what they are given, and one rule for each kind of surface.

1. **`withoutPrivateNames(data)`** leaves no private repository identifiable. Nothing else changes: every number, the timezone and the hourly data stay.
   - **`repositories.top`** keeps each private entry in its rank, with its commits, but anonymised: `nameWithOwner` becomes `PRIVATE_REPO_NAME` (`"private"`, exported by `@wyg/schema` and `@wyg/analytics`; no slash, so it never reads as a real `owner/name`), `primaryLanguage` is `null`, `stars` and `forks` are 0, `isFork` is false and `createdAt` is the period start. `isPrivate` stays true. Dropping the entry instead would let the story credit the next public repository as the year's main one, a false statement.
   - **`community.mostStarred`, `mostStarredNew`, `mostForked` and `starred.top`** drop private entries: each names one repository as a highlight, and an unnamed highlight says nothing.
2. **`toPublicRecap(data)`** is `withoutPrivateNames` plus the timezone set to UTC and the hourly histogram marked unavailable ("Not shared publicly"). It also drops the night-owl score (it inverts to the night share) and, for a night owl, the reason that names the 22:00-04:00 window; the archetype's label stays (#63). Numbers never differ between the projections; only names and identifying details go.
3. **The projection is the only gate.** Scenes draw the names they are given (`repoLabel` in `packages/video/src/present.ts` does not filter), so the data passed to the composition alone decides whether a private name shows. A filter inside the scenes would turn the owner's "show" choice into a no-op. The scenes only recognise the anonymised entry (`isAnonymised`: private and named `PRIVATE_REPO_NAME`): the projects shelf labels its stack "Private repository" with its real commit count, and the letter credits "One private project" when it is the top repository. A private repository the owner chose to show keeps its real name.

### Rule 1: every public surface uses the public projection

The public page `/u/<login>`, the story played on it (the public player, which renders `toPublicRecap(data)` without the letter: `publicWorld` in `apps/web/src/app/recap/public-world.ts`), its card (`/api/card`, the PNG also offered in the owner's files) and its OG image always render `toPublicRecap(data)`, whatever the owner chose. Visitors cannot export.

### Rule 2: the owner's own story and files follow the owner's choice

- **Where the choice lives:** `users.show_private_names`, a nullable boolean with no default. `null` means not asked yet. It is per person, not per year, so a new edition does not ask again, and deleting the account deletes it.
- **The question** is asked once, on `/recap` before the first stop, only while the column is `null`: "Show your private repository names?", with two buttons, "Show them" and "Hide them". The answer is saved with a server action and the story starts.
- **"Show them"** (`true`): the story and the files use the full data. When the story draws a private repository's name (`hasPrivateNames`, which asks `drawsPrivateName` in `packages/video/src/present.ts`: the projects shelf or the letter; an anonymised entry names nothing and does not count), the files carry the reminder "These files include your private repository names." above the download buttons.
- **"Hide them", or not answered** (`false` or `null`): the story and the files use `withoutPrivateNames(data)`. The dashboard's "Download your story" uses this view until the owner answers.
- **Settings** shows the current choice ("Private repositories") with one button that switches it, and says the public page never shows them.

Code: `apps/web/src/server/privacy.ts` (`getPrivateNamesChoice`, `setPrivateNamesChoice`), `apps/web/src/server/projection.ts` (`storyData`, `hasPrivateNames`, `showFilesReminder`; the pages import them through `privacy.ts`, which re-exports them), `apps/web/src/app/recap/private-names-question.tsx`, `apps/web/src/app/recap/reminder.ts`, `apps/web/src/app/settings/page.tsx`.

AGENTS.md rule 6 now reads: private repository names never appear on a public surface; in the owner's own story and files they follow the owner's choice (this ADR).

## Alternatives

- **Always hide (rule 6 as it was):** the safest default, but the owner never sees their own private work, which is often the point of the year.
- **Always show to the owner, warn on download:** files are made to be shared, so a private name would leave with a video the owner did not look at closely. Asking once, with the reminder on the files, keeps the default explicit.
- **Use `toPublicRecap` for the owner's hidden view:** one projection fewer, but the owner's own story would lose their timezone and hour chart for no privacy gain.
- **Ask per year or per download:** more friction for a choice that rarely changes; Settings covers the change.

## Consequences

- The public page and the owner's hidden view show a private repository's stack and commit count without its name ("Private repository"). Before the anonymisation they dropped it; the count was already public through the totals, and the rank keeps the letter and the shelf true.
- A file shown with names can name a private repository once the owner shares it. The question, the reminder and the Settings switch make that the owner's informed choice; public pages are unaffected.
- Every new public surface must render `toPublicRecap`, and every new owner surface must go through `storyData` with the stored choice. A new field that names a private repository must be added to `withoutPrivateNames` (and is then hidden from the public too), and a new scene or letter line that names a repository must be added to `drawsPrivateName`, so the reminder stays true.
- The choice is a database column, so the round trip (store, read back, change in Settings) is checked in the browser, not by a unit test: the repository has no database test harness.
