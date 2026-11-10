# Story world, phase 4: the switch-over — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The story world becomes the only story. `/recap` plays it for the owner after one question about private repository names. `/u/<login>` gets a card and a public player. The dev gate goes, and the old story, server slide routes, still worker and Lambda are removed.

**Architecture:** One nullable column on `users` stores the private-names choice; `null` means "not asked yet". A pure helper picks the projection from that choice. The existing world player gains two variants:

- the **owner** variant: the choice's projection, exports allowed, and the reminder when names show;
- the **public** variant: always the public projection, no letter pages, no exports, and exit and end return to the card.

The old `WrapStory` path is deleted together with every module only it reached.

**Tech Stack:** Next.js 16 (App Router, Cache Components), Drizzle + Postgres, Remotion 4.0.540, `@remotion/web-renderer`, Bun test, Biome.

**Spec:** `docs/superpowers/specs/2026-11-06-story-world-design.md`, sections "Private repository names", "The public page", "Where exports live" and "Calls I made" (the ADR amending rule 6). Previous plans: `docs/superpowers/plans/2026-11-09-story-world-1-engine.md`, `…-2-scenes.md`, `2026-11-10-story-world-3-exports.md`.

## Decisions this plan makes (the maintainer can override them)

- **Where the answer lives:** `users.show_private_names boolean` (nullable, no default). It is per person, not per year, so a new edition doesn't ask again. Deleting the account deletes it.
- **The question** is asked on `/recap` before the first stop, only while the column is `null`. It is a full-screen web-only screen with two real buttons:
  - "Show them": private names appear in your story and in the files you download;
  - "Hide them": the story and files use the public view.

  The answer is saved with a server action, and the story starts.
- **`/recap/world` is deleted.** `/recap` is the story. There is no sample fallback: without a recap, `/recap` shows the existing "No story yet" panel, with the site header kept on that panel only.
- **The public player** runs on the same page as the card (client state, no new route), so the card's metadata stays the page's metadata.
- **`apps/renderer` is deleted.** Its Node still renderer (`still.ts`) is still used by the dev scripts `scripts/render-art.ts` and `scripts/world-stills.ts`, so it moves to `scripts/lib/still.ts` unchanged. Lambda deploy, worker, client and config go.
- **ADR-0017** amends AGENTS.md rule 6: in the owner's own story and files, private names follow the owner's choice; every public surface (`/u/<login>`, its card and OG image) always hides them.

## Global Constraints

- AGENTS.md rules 1–8. Rule 6 is amended by ADR-0017 in Task 6. Until then, the code in Tasks 1–5 must already behave as ADR-0017 says.
- **Copy, verbatim from the spec:**
  - question: "Show your private repository names?";
  - export reminder: "These files include your private repository names.";
  - public play button: "Play @login's year" (with the real login);
  - after the public story: "Make your own".
- **Numbers never differ between the projections.** `toPublicRecap` removes names and identifying details only.
- **Visitors cannot export.** The public variant renders no `ExportPanel`, and the renderer chunk is never requested on `/u/<login>`. The share card (`/api/card`) stays as it is.
- **Player UI:** WCAG 2.2 AA and antislop R-39 to R-41. Load `antislop:antislop`, `antislop-human` and `antislop-ui` before UI edits.
- **Web-renderer limits** (spec "Constraints") still bind every scene. The web-modules guard (`packages/video/src/web-modules.test.ts`) must pass, and server code never imports Remotion.
- **Commits:** Conventional Commits in English, no AI attribution, on one branch for this phase.

## Review Focus

- **An owner who never answers the question** (closes the tab on it). The next visit asks again, and nothing is stored. _(Task 1 test: `getPrivateNamesChoice` returns `null` for a new user; Task 3 renders the question for `null`.)_
- **An owner who chose "Hide" and has private repositories.** No private `nameWithOwner` appears in the data given to the player or to `ExportPanel`. _(Task 1 test on `storyData`.)_
- **A visitor on `/u/<login>` whose owner chose "Show".** It is still the public projection, with no letter stops and no export panel. _(Task 5 test on `publicWorld`, plus a check that the page passes `getPublicRecap` data only.)_
- **The owner changes the answer in Settings after a story was played.** The next `/recap` uses the new choice without asking again. _(Task 4 test: the action stores `false`→`true`, and `getPrivateNamesChoice` reads it.)_
- **A letter with many pages on the public page.** No letter stop exists, and the closing stop is still last. _(Task 2 test.)_

---

### Task 1: The private-names choice, stored and applied

**Files:**

- Modify: `apps/web/src/server/db/schema.ts` (add the `users.showPrivateNames` column, `boolean("show_private_names")`, nullable).
- Create: `apps/web/drizzle/0004_*.sql`, generated with `cd apps/web && bunx drizzle-kit generate`. It must contain exactly one `ALTER TABLE "users" ADD COLUMN "show_private_names" boolean;`.
- Create: `apps/web/src/server/privacy.ts` and `privacy.test.ts`.

**Interfaces:**

- Produces:
  - `getPrivateNamesChoice(userId: string): Promise<boolean | null>`
  - `setPrivateNamesChoice(userId: string, show: boolean): Promise<void>`
  - `storyData(data: RecapData, showPrivateNames: boolean): RecapData`: returns `data` itself when the answer is `true`, and `toPublicRecap(data)` otherwise.
  - `hasPrivateNames(data: RecapData): boolean`: true when any repository in `repositories.top` or `starred.value.top` is private. It decides whether to show the export reminder.

- [ ] **Write failing tests in `privacy.test.ts`** (pure functions only; the database functions are covered by Task 3's browser check and Task 4's action test):
  - `storyData(fixture, false)` has no `nameWithOwner` of a private repository (scan `JSON.stringify`), and `contributions.total` is equal in both projections.
  - `storyData(fixture, true)` is the same object as the input (`toBe`).
  - `hasPrivateNames` is true for a fixture with one private top repository, and false for `toPublicRecap` of that fixture.
  - Build the fixture from `sampleRecap` (`@wyg/video`) with one repository set to `isPrivate: true`, as `packages/analytics/src/public.test.ts` does.
- [ ] Run `bun test apps/web/src/server/privacy.test.ts`. Expect: FAIL, module not found.
- [ ] Add the column and generate the migration. Then implement `privacy.ts`, reusing the `db` and `users` imports the way `server/recaps.ts` does.
- [ ] Apply the migration to the dev database (`bun scripts/dev-db.ts`, then `cd apps/web && bunx drizzle-kit migrate`). Run `bun test`, `bun run typecheck` and `bun run lint`. Expect: all pass.
- [ ] Commit `feat(web): remember whether to show private repository names`.

### Task 2: A world without the letter

**Files:** Modify `packages/video/src/world/model.ts`, `stops.ts` and `WorldStory.tsx`. Tests go in `packages/video/src/world/model.test.ts` (or `stops.test.ts`, following where stop tests already live).

**Interfaces:**

- Produces:
  - `buildWorld(data, format, mode, fps, options?: { letter?: boolean })`, where `letter` defaults to `true`;
  - `worldDuration(data, format, mode, options?)`, with the same option;
  - `buildStops(data, city, { letterPages, letter })`, which omits every `letter-*` stop when `letter === false`;
  - `WorldStoryProps.letter?: boolean`, passed through to `buildWorld`.
- Consumes: nothing new.

- [ ] **Write failing tests:**
  - With `{ letter: false }`, no stop id starts with `letter`, and the last stop's kind is `closing`.
  - The stop count equals the default stop count minus the letter pages, for `sample` and for the long-names fixture.
  - `worldDuration` with `{ letter: false }` is shorter than without it.
  - Camera stops for the remaining stops are unchanged, compared by id.
- [ ] Run the tests. Expect: FAIL.
- [ ] Implement the option. The default path must stay byte-identical: the existing world tests and `export.test.ts` pass unchanged.
- [ ] Run `bun test` and `bun run typecheck`. Expect: PASS.
- [ ] Commit `feat(video): a world without the letter for the public page`.

### Task 3: `/recap` is the story world

Load the antislop skills first.

**Files:**

- Move `apps/web/src/app/recap/world/*` into `apps/web/src/app/recap/` with `git mv` (player, controller, exports, export-panel, runner, state, `use-sfx` and their tests). Delete `apps/web/src/app/recap/world/page.tsx`.
- Replace `apps/web/src/app/recap/page.tsx`.
- Create `apps/web/src/app/recap/private-names-question.tsx` and `apps/web/src/app/recap/actions.ts`.
- Delete `story-flow.tsx`, `story-player.tsx` and `letter-sheet.tsx`, plus the `SampleWorldPlayer` export and its sample-data label. Keep `use-music.ts`, which the world player imports.
- Modify `apps/web/src/app/dashboard/page.tsx`: remove the `NODE_ENV` gate on `DownloadSection`, and pass it `storyData(recap.data, choice ?? false)` plus `privateNames`.

**Interfaces:**

- Consumes: Task 1's `getPrivateNamesChoice`, `setPrivateNamesChoice`, `storyData` and `hasPrivateNames`.
- Produces:
  - `setPrivateNamesAction(form: FormData): Promise<void>` in `recap/actions.ts`. It reads `show` = `"yes" | "no"`, saves the choice for the current user, and calls `refresh()`, as `dashboard/actions.ts` does.
  - `WorldPlayer` props become `{ data: RecapData; privateNames: boolean }`. The player passes `data` to `ExportPanel`, so the files follow the choice.
  - `ExportPanel` gets a new prop `privateNames: boolean`. When it is true, the panel shows the reminder line above the buttons.

**Behaviour:**

- `/recap` checks, in order:
  1. Signed out: redirect to `/`.
  2. No recap: the existing "No story yet" panel, with the site header.
  3. Choice is `null`: the question screen (full screen, no header). Its heading is the question; the buttons are "Show them" and "Hide them", plus one sentence on what each does. Both are `<button type="submit">` in one form, with `name="show"` and values `yes` and `no`.
  4. Otherwise: `<WorldPlayer data={storyData(data, choice)} privateNames={choice && hasPrivateNames(data)} />`.
- The page stays `robots: noindex`, and `metadata.title` is "Your story".

- [ ] Write a failing test for the reminder rule. Put it in `export-state.test.ts` (or a tiny `reminder.ts` helper): `showReminder(privateNames)`, and the reminder copy constant equals the spec's sentence verbatim.
- [ ] Run it. Expect: FAIL.
- [ ] Implement the move, the page, the question, the action, the props and the dashboard change. Then `rg -n "recap/world|SampleWorldPlayer|StoryFlow|story-player|letter-sheet" apps` must return nothing.
- [ ] Run `bun run typecheck && bun test && bun run lint`, then `cd apps/web && bunx next build`. Expect: all pass, and `/recap` builds as a partial prerender with no "createContext" error.
- [ ] Commit `feat(web): the story world is the story` and `feat(web): ask once about private repository names`. These are two commits: the question and action first, then the switch.

### Task 4: Settings can change the answer

Load the antislop skills first.

**Files:** Modify `apps/web/src/app/settings/page.tsx` (a "Private repositories" section before "Devices"). Reuse Task 3's `setPrivateNamesAction`, with a `redirectTo` hidden field. The test goes in `apps/web/src/app/recap/actions.test.ts`.

**Interfaces:** Consumes `getPrivateNamesChoice` and `setPrivateNamesAction`. `setPrivateNamesAction` gains an optional `redirectTo` form field: `"/settings"` only. Validate it against that one allowed value; any other value is ignored, so the action can't become an open redirect.

**Behaviour:**

- The section is titled "Private repositories". It says which choice is current ("Shown in your story and your files" / "Hidden everywhere"), or "Not chosen yet; you'll be asked before your story".
- One button switches to the other choice.
- It also states: "Your public page never shows them."

- [ ] Write a failing test for the redirect rule. `safeRedirect(value: FormDataEntryValue | null): "/settings" | null` returns `"/settings"` only for that exact string, and `null` for `"//evil"`, `"https://x"`, `"/dashboard"` and `null`.
- [ ] Run it. Expect: FAIL.
- [ ] Implement it, then the section.
- [ ] Run the checks. Expect: pass.
- [ ] Commit `feat(web): change the private names choice in settings`.

### Task 5: The public page plays the world

Load the antislop skills first.

**Files:**

- Modify `apps/web/src/app/u/[login]/page.tsx`: replace the old `StoryPlayer` section with the card and player. Keep `generateMetadata`, the archetype section and `ClosingSection`.
- Create `apps/web/src/app/u/[login]/public-story.tsx` (client component).
- Modify `apps/web/src/app/recap/world-player.tsx` to add the public variant.
- Create `apps/web/src/app/recap/public-world.ts` and `public-world.test.ts`.

**Interfaces:**

- Consumes: Task 2's `letter` option, and `getPublicRecap` (already the public projection).
- Produces:
  - `WorldPlayer` props become a union: `{ variant: "owner"; data; privateNames } | { variant: "public"; data; onExit: () => void }`. The public variant:
    - passes `letter: false` to the world;
    - never renders `ExportPanel` and never imports `./exports`;
    - shows no "Keep your year" cue;
    - on Close, Escape, or Next at the settled closing stop, calls `onExit()`.
  - `publicWorld(data: RecapData)` in `public-world.ts` returns `{ data: toPublicRecap(data), letter: false }`. It is the one place that decides what a visitor sees. It applies `toPublicRecap` again even though `getPublicRecap` already did, which is cheap and keeps the guarantee local.

**Behaviour:**

- **Card:** Cell's head (`HeadArt`, or the existing head art id from `@wyg/video` art), `@login`, the total with "contributions", the year (or "so far"), the note "Private repository names are not shown.", and a primary button "Play @login's year".
- **Playing:** the same full-screen player, which hides the site header and footer while it plays.
- **On exit:** back to the card, with focus on the play button. The card now also shows "Make your own" (link to `/`).

- [ ] **Write failing tests in `public-world.test.ts`:**
  - `publicWorld(fixtureWithPrivate)` contains no private `nameWithOwner`, and has `letter === false`.
  - For the same fixture whose owner chose "Show" (simulate by passing the full data), the result is still the public projection.
- [ ] Run them. Expect: FAIL.
- [ ] Implement the helper, the variant, the card and the client state.
- [ ] Run the checks and the production build. Then confirm `/u/[login]` doesn't reference the renderer chunk: `rg -l "web-renderer" apps/web/.next/server/app/u` returns nothing, and the client manifest for `/u/[login]` has no `exports` chunk.
- [ ] Commit `feat(web): the public page plays the story world`.

### Task 6: Remove the old paths, write ADR-0017

**Files to delete:**

- `apps/web/src/app/api/story/` (pdf, zip, slide)
- `apps/web/src/server/slides.tsx`, `apps/web/src/server/exports.ts` and `exports.test.ts`
- `apps/renderer/`, after `git mv apps/renderer/src/still.ts scripts/lib/still.ts` and updating the imports in `scripts/render-art.ts` and `scripts/world-stills.ts`
- `packages/video/src/WrapStory.tsx` and `packages/video/src/scenes/`
- every `packages/video/src` module that no remaining entry reaches, as determined by the reachability step below

**Files to modify:**

- `packages/video/src/Root.tsx`: drop the `wrap-*` compositions.
- `packages/video/src/index.ts`: drop the `WrapStory` exports.
- `apps/web/next.config.ts`: drop `@wyg/renderer`.
- Root `package.json` workspaces, if they list `apps/renderer`, and `bun.lock`.
- Any `.github/workflows` step that references `apps/renderer`.
- Docs:
  - `docs/architecture/decisions/0017-private-names-follow-the-owner.md` (new; amends AGENTS.md rule 6)
  - AGENTS.md: rule 6 text, the repository map (no `apps/renderer`), the data-flow line, and the commands table (drop "Deploy Lambda renderer")
  - `docs/video/scene-system.md` export section
  - `docs/product/roadmap.md`
  - `docs/README.md` ADR table
  - ADR-0016: the "removals land in phase 4" consequence becomes "done"

**Reachability rule** (decides which old modules go): a file in `packages/video/src` stays if it is imported, directly or transitively, by any of these:

- `world/**`
- `Root.tsx`
- `remotion-entry.ts`
- `three/ArtStill.tsx` (used by the bake script)
- any `packages/video/package.json` export
- `apps/web/src/**`, `scripts/**` or `packages/*/src/**` outside `packages/video`

Tests of deleted modules go with them. List every deleted file in the commit body.

- [ ] Delete in this order, running `bun run typecheck && bun test` after each group: routes and server modules; then `apps/renderer` (with the move); then the old story in `packages/video`.
- [ ] Check that nothing still points at the deleted code: `rg -n "WrapStory|wrap-9x16|@wyg/renderer|SLIDE_EXPORTS|slideExportsAvailable|api/story|still-worker|lambda" apps packages scripts .github --glob '!**/node_modules/**'` returns nothing outside the ADRs and the changelog.
- [ ] Run `bun install`, so `bun.lock` loses `@remotion/lambda` and the renderer workspace. Then run `bun run typecheck && bun test && bun run lint`, the web production build, and `bun scripts/world-stills.ts closing` (the dev tool still works with the moved `still.ts`).
- [ ] Write ADR-0017 in the existing ADR format. It records the decision and two rules:
  - the public projection on every public surface;
  - the owner's choice for their own story and files, with the one-time question, the reminder copy, and the Settings switch.
- [ ] Commits: `refactor(web): drop the server slide routes`, `chore: remove apps/renderer, keep the still renderer for dev scripts`, `refactor(video): remove the old story`, and `docs: ADR-0017, private names follow the owner`.

### Task 7: End-to-end check in a real browser

This task is run by the controller. It has no files to change; fixes found here become their own `fix(...)` commits.

- [ ] **Owner, first visit.** Use a synthetic user with a recap that has a private repository. Log in on the `127.0.0.1` origin with an in-browser token (as in phase 3); delete the user afterwards.
  1. `/recap` shows the question.
  2. Answer "Hide them": the story plays, the projects stop shows no private name, and the end-screen panel shows no reminder.
  3. In Settings, switch to "Show": `/recap` plays without asking, and the private name appears at the projects stop.
  4. The panel shows the reminder. A slides ZIP contains the private name on the projects slide.
- [ ] **Public page.** Share the recap, then open `/u/<login>`.
  1. The card shows the note.
  2. Play: there is no letter stop, and no "Keep your year" cue.
  3. Close returns to the card, with focus on the play button and "Make your own" shown.
  4. The network log shows no `web-renderer` chunk.
- [ ] **Removed routes.** `/api/story/slide/1` and `/recap/world` return 404.
- [ ] **Layout and console.** At 375 px and on desktop, the console is clean (the Remotion licence warning is known).

---

## After this phase

PR `feat: story world phase 4, the switch-over`, with `Closes #<issue>`, the browser-check results and the self-review. The story world is then live for everyone. The next projects from the spec's Non-goals:

- a recap from a username without signing in;
- sign-in with organisation access;
- tidying the URLs;
- head-only Cell on the loading and landing pages.
