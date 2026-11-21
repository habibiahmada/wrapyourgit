# Changelog

All notable changes to WrapYourGit are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-11-21

### Added

- README images for every GitHub username, built from the stored public recap and never starting a GitHub fetch (ADR-0035) ([#193](https://github.com/habibiahmada/wrapyourgit/issues/193)):
  - a badge at `/<username>/badge.svg` with the year and up to four values (`?show=contributions,streak,days,language,archetype`), the top language with its logo;
  - a card at `/<username>/card.svg` with the archetype's diorama beside the numbers, `?archetype=left|right`, `?hide=archetype,name,stats`, the year's graph with `?show=graph`, and a 360 px `?layout=compact` for phones;
  - a snake at `/<username>/snake.svg` that wanders through the year's graph eating each day with contributions and grows as it goes (it loops, the maintainer's call; reduced motion shows the still graph).
- The landing page shows the three README images from the sample recap, with the compact card on phones.
- "Put it in your README" on the dashboard: pick an image and its options, see it as GitHub will, and copy the Markdown (or HTML with `<picture>` for a card that switches to the compact one on phones).
- The landing page's story frames open larger: choose one in the reel to see it over a dark overlay, step through the others, and close it with Escape, the close button or a click outside ([#199](https://github.com/habibiahmada/wrapyourgit/issues/199)).

### Changed

- Search engines, link previews and language models hear about the README images: the site's description, keywords and structured data name them, the FAQ says how to use them, `llms.txt` and `llms-full.txt` list their URLs and options, and the landing's README section can be linked as `/#readme`. The repository README shows the author's own badge, card and snake ([#207](https://github.com/habibiahmada/wrapyourgit/issues/207)).
- Slides, the PDF, the share card and the card with private work open in a preview before they download, with Download and Close; closing drops the file. The video still downloads as soon as it is made. Dialogs fade and rise in instead of appearing at once, with a quick fade only under reduced motion ([#201](https://github.com/habibiahmada/wrapyourgit/issues/201)).
- The dashboard matches the landing page: only the site's palette (last year in grey instead of blue, a smaller year in a neutral chip instead of amber), green links, 12px boxes and the landing's isometric floor, faint. It stays a tool, with no bands, glass or scenery ([#203](https://github.com/habibiahmada/wrapyourgit/issues/203)).

### Fixed

- Exported slides (PNG, ZIP, PDF) and the landing page's frames no longer carry the story's progress bar along the top, which on a single frame read as a loading line; the player and the MP4 keep it, and the copyright line stays ([#197](https://github.com/habibiahmada/wrapyourgit/issues/197)).
- The dashboard's "You can sync again at" time no longer differs between the server's page and the browser's (a hydration mismatch): it reads in UTC until the browser's timezone is known, then in local time ([#195](https://github.com/habibiahmada/wrapyourgit/issues/195)).
- The dashboard's README panel uses the shared palette's green and 12 px boxes like the rest of the dashboard ([#205](https://github.com/habibiahmada/wrapyourgit/issues/205)).

## [1.0.0] - 2026-11-19

The first release: the 2026 edition, live at [wrapyourgit.com](https://wrapyourgit.com).

### Added

- The export dialog in the story shows the percentage beside its bar, and both export screens estimate the time left once the speed so far means something ("About 2 min left") ([#144](https://github.com/habibiahmada/wrapyourgit/issues/144)).
- A nightly backup of the production database: a `pg_dump` uploaded to a private, encrypted S3 bucket in Singapore with short-lived OIDC credentials, kept 14 days. The privacy policy names it and its retention ([#134](https://github.com/habibiahmada/wrapyourgit/issues/134)).
- Page views and Core Web Vitals counted with Cloudflare Web Analytics on production only: no cookies, nothing stored in the browser. The privacy page says what is collected ([#132](https://github.com/habibiahmada/wrapyourgit/issues/132)).
- A check that a person is asking before the server reads a new public recap from GitHub: a visitor who is not signed in passes Cloudflare Turnstile once an hour, stored recaps and their link previews are never checked, and it stays off until its two keys are set (ADR-0026) ([#107](https://github.com/habibiahmada/wrapyourgit/issues/107)).
- The story is a train ride through your year as a city. Cell drives an engine along a rail lined with one square per day, through a gate for each month that counts the year so far, and stops at fourteen stations: hello, your first day, private work, the whole city from above, your busiest day, your rhythm, languages, projects, community, engineering, your archetype, against last year, a letter from Cell and a closing party. Every number is printed on something in the scene. It is drawn on one 2D canvas, with no WebGL (ADR-0023) ([#86](https://github.com/habibiahmada/wrapyourgit/issues/86), [#88](https://github.com/habibiahmada/wrapyourgit/issues/88), [#92](https://github.com/habibiahmada/wrapyourgit/issues/92)).
- At the letter the train stops, the camera comes in to a writing desk, the envelope there opens and the letter comes out before it fills the screen. Each later page slides in from the side ([#88](https://github.com/habibiahmada/wrapyourgit/issues/88), [#94](https://github.com/habibiahmada/wrapyourgit/issues/94)).
- The web story fills the window instead of sitting between bands, and after five seconds at a stop it shows where to tap (ADR-0024) ([#94](https://github.com/habibiahmada/wrapyourgit/issues/94), [#96](https://github.com/habibiahmada/wrapyourgit/issues/96)).
- The sound of wheels on the rails for as long as each move lasts ([#92](https://github.com/habibiahmada/wrapyourgit/issues/92)).
- An MP4 in four shapes (9:16, 4:5, 1:1, 16:9), a PNG slide for every stop, a ZIP of them and one PDF, all made in your browser with no render server (ADR-0016) ([#56](https://github.com/habibiahmada/wrapyourgit/issues/56)).
- A recap for every GitHub username at `/<username>`, built from public activity only. The signed-in owner sees their full recap at the same address, and Settings has a switch to hide the public one (ADR-0019) ([#67](https://github.com/habibiahmada/wrapyourgit/issues/67)).
- Stars gained this year on public recaps, read from GitHub's star history, and a time budget on the first public fetch so a heavy account cannot run past the limit (ADR-0020) ([#71](https://github.com/habibiahmada/wrapyourgit/issues/71)).
- Page views counted with Vercel Web Analytics: no cookies, and query strings are removed before a view leaves the browser. The privacy page says what is collected ([#75](https://github.com/habibiahmada/wrapyourgit/issues/75)).
- "Sign out on all devices" in Settings ([#44](https://github.com/habibiahmada/wrapyourgit/issues/44)).
- GitHub's mark in the header links to the repository, and the sample reel on the landing page has a visible Pause button ([#90](https://github.com/habibiahmada/wrapyourgit/issues/90)).
- Preview deployments get their own Neon database branch, and a per-IP rate limit (60 per minute, then 429) covers `/api` and `/u/` ([#36](https://github.com/habibiahmada/wrapyourgit/issues/36)).
- Production is live on Vercel + Neon at wrapyourgit.habibiahmada.dev (ADR-0015) ([#34](https://github.com/habibiahmada/wrapyourgit/issues/34)).
- A deployment guide: staging on Vercel + Neon, production on an AWS VPS (systemd, Caddy, Postgres), updates, rollback, backups and the pre-launch checklist ([docs/deployment/guide.md](docs/deployment/guide.md)).
- The contribution workflow is enforced: git hooks installed by `bun install`, a CI `Policy` check, merge-commit-only repository settings, and rulesets ready for when the repository is public (ADR-0014) ([#28](https://github.com/habibiahmada/wrapyourgit/issues/28)).
- A live 3D chibi Cell for the story, with arms, legs, head and face that move on the beat (ADR-0010) ([#20](https://github.com/habibiahmada/wrapyourgit/issues/20)).
- A different camera-like transition for every cut (dive, tilt, whip pan, iris, blinds, card flip, a flash for the archetype, pull-back), a sound for every animation, and a gap-free looping soundtrack on the web; the MP4 carries the same effects on the same frames ([#20](https://github.com/habibiahmada/wrapyourgit/issues/20)).
- Repositories you starred this year: count, the five most popular and their languages, on the dashboard and in the story's Community scene ([#14](https://github.com/habibiahmada/wrapyourgit/pull/14)).
- One header for every page, a favicon and app icons from the six-cell mark, complete SEO for wrapyourgit.habibiahmada.dev (metadata, Open Graph, JSON-LD, sitemap, robots, manifest), `llms.txt` and `llms-full.txt`, and an author credit in the footer ([#12](https://github.com/habibiahmada/wrapyourgit/pull/12)).
- A Settings page with "Delete my data", moved off the dashboard ([#10](https://github.com/habibiahmada/wrapyourgit/pull/10)).
- Comparison with the same span of last year, private repositories through an optional app installation, a profile-style dashboard, warm-up slides and language logos ([#6](https://github.com/habibiahmada/wrapyourgit/pull/6)).
- Redesigned public pages with navigation, marketing sections and illustrated backgrounds ([#4](https://github.com/habibiahmada/wrapyourgit/pull/4)).
- Continuous music across the story, varied illustrations and a richer letter from Cell ([#2](https://github.com/habibiahmada/wrapyourgit/pull/2)).
- GitHub App sign-in, encrypted tokens and sync to Postgres; kinetic poster scenes with a beat-synced track; schema-valid recaps from a real account (milestones M1–M2).
- Project documentation: README, contributing guide, code of conduct, security policy, issue and pull request templates, and CI.

### Changed

- The site's title and the hero's lead call it a GitHub year in review, the words people search with, as a description and never as its name: "WrapYourGit 2026: your GitHub year in review, animated" ([#189](https://github.com/habibiahmada/wrapyourgit/issues/189)).
- The landing page is lighter: the hero keeps its headline, a one-line lead, the username field and the sign-in, and its art sits further right. The username field is one pill with a search button, links underline with a line that draws in from the left on hover, the header's section links no longer highlight like buttons, the phone menu's sign-in spans the menu, and Slides, PDF and Share card each have an icon. The note that the site is not affiliated with GitHub now sits in the closing section and the footer ([#167](https://github.com/habibiahmada/wrapyourgit/issues/167)).
- On a phone the hero starts further below the header ([#165](https://github.com/habibiahmada/wrapyourgit/issues/165)).
- The header links to the source with GitHub's mark again, and its sign-in button reads "Sign in" so the mark never sits beside "Sign in with GitHub". The landing page keeps "Sign in with GitHub" with the note that the site is not affiliated with GitHub (ADR-0031) ([#163](https://github.com/habibiahmada/wrapyourgit/issues/163)).
- The soundtrack is brighter: a little EQ when it is prepared (less boom under 160 Hz, a touch of presence at 2.5 kHz, more air above 4 kHz), because the lo-fi mix sounded muffled on phone and laptop speakers. It plays at the same loudness as before ([#161](https://github.com/habibiahmada/wrapyourgit/issues/161)).
- Six of the ride's sound effects have more body: the closing's firework, the steam at the rhythm scene, the flag, a page turned, the wooden box and the seesaw are built from layers (struck modes, shaped noise, a falling thump) with a little room around them. Still synthesised and CC0; each sound now draws its own noise, so changing one never changes another ([#159](https://github.com/habibiahmada/wrapyourgit/issues/159)).
- The story's music is "Traveling in your mind" by Loyalty Freak Music, a CC0 track from the Free Music Archive, in place of the synthesised one. It plays about three minutes before it repeats, and the repeat joins without a seam (ADR-0030) ([#155](https://github.com/habibiahmada/wrapyourgit/issues/155)).
- The site is titled after itself: "WrapYourGit 2026: your year of code as an animated story". Page titles, the description and the search metadata no longer call it a GitHub Wrapped, and the description says it is not affiliated with GitHub, after Safe Browsing listed the domain as deceptive ([#153](https://github.com/habibiahmada/wrapyourgit/issues/153)).
- The MP4 export does less repeated work per frame, with the same picture: fog colours are parsed once and the painter sets a colour or font only when it changes. Measured in Chrome, the scene is about 30% faster to build and the whole export about 5% faster; most of a frame is the canvas fill and the H.264 encode ([#141](https://github.com/habibiahmada/wrapyourgit/issues/141)).
- The web pages wear a warm dark palette of their own instead of GitHub's exact colours, the header links to the source with a code icon instead of GitHub's mark, and the sign-in says the site is not affiliated with GitHub. Chrome had flagged the site as a deceptive copy of GitHub (ADR-0029) ([#139](https://github.com/habibiahmada/wrapyourgit/issues/139)).
- Production moved to [wrapyourgit.com](https://wrapyourgit.com); the old domain redirects there (ADR-0025). Titles, descriptions, keywords, JSON-LD, the FAQ and `llms.txt` describe the site as a GitHub Wrapped, and a NOTICE file and a README section ask forks to keep the credit ([#98](https://github.com/habibiahmada/wrapyourgit/issues/98)).
- The ride replaces the earlier stories: the story world with a moving camera, its scenes and its cut transitions are gone, on the web and in every file ([#92](https://github.com/habibiahmada/wrapyourgit/issues/92)).
- The landing page is one isometric world. The hero is a quarter of a sample year as a city; each archetype, the letter, privacy and the closing are city blocks with Cell in the middle (ADR-0021, ADR-0022); and every section holds one to three things: the story in three acts, twelve frames of the ride, three measures with their definitions, archetypes in two rows of three, three privacy promises and the FAQ in two groups ([#80](https://github.com/habibiahmada/wrapyourgit/issues/80), [#84](https://github.com/habibiahmada/wrapyourgit/issues/84), [#88](https://github.com/habibiahmada/wrapyourgit/issues/88), [#90](https://github.com/habibiahmada/wrapyourgit/issues/90)).
- Cell is a contribution cell: one block with pixel eyes, bar brows and a crest of three cells, dressed in blocky gear for each archetype (ADR-0021) ([#84](https://github.com/habibiahmada/wrapyourgit/issues/84)).
- The landing page speaks to "you": "Type your GitHub username", "Play your year" and "Open your recap" ([#90](https://github.com/habibiahmada/wrapyourgit/issues/90)).
- Public recap lookups are faster and stop before GitHub's REST quota runs out ([#73](https://github.com/habibiahmada/wrapyourgit/issues/73)).
- Images and illustrations cannot be dragged, selected or saved from a right-click. Alt text is unchanged ([#26](https://github.com/habibiahmada/wrapyourgit/issues/26)).
- The footer, README and third-party notices describe WrapYourGit as an independent project instead of disclaiming an affiliation.
- Cell moves everywhere as baked 3D loops instead of live WebGL: animated WebP on the pages (a still under reduced motion) and sprite sheets in the story; the web app no longer ships three.js (ADR-0013) ([#24](https://github.com/habibiahmada/wrapyourgit/issues/24)).
- The Projects chapter shows the year's commits as a 10 × 10 waffle coloured by repository, with names, commits and shares ([#24](https://github.com/habibiahmada/wrapyourgit/issues/24)).
- The letter has a letterhead with Cell's head, a postmark, the person's own contribution strip as the rule, a motif on the paper and a signature flourish, on the web and in the letter slide ([#24](https://github.com/habibiahmada/wrapyourgit/issues/24)).
- Cell is the story's only mascot: live in five scenes with its own pose and gear, a giant faint silhouette in four, GitHub motifs (contribution cells, a branch graph) on every field, and Cell running sideways across each cut. Each archetype has its own colour, pose and public-domain photo in the web art; the 3D block cities, moon and floating cubes are gone (ADR-0012) ([#22](https://github.com/habibiahmada/wrapyourgit/issues/22)).
- Slide exports (PNG, ZIP, PDF) are frames of the story composition, so they match the story exactly (ADR-0011) ([#22](https://github.com/habibiahmada/wrapyourgit/issues/22)).
- Every page, the landing sample reel, the README and the docs show the chibi Cell; the old cube mascot is retired ([#22](https://github.com/habibiahmada/wrapyourgit/issues/22)).
- The soundtrack is more energetic: four-on-the-floor kick, sixteenth hats, a driving bass and a lead hook, on the same 120 BPM grid ([#20](https://github.com/habibiahmada/wrapyourgit/issues/20)).
- Illustrations use a matte, studio-lit finish ([#10](https://github.com/habibiahmada/wrapyourgit/pull/10)).
- The landing hero fills 90% of the viewport with the contribution graph at its base ([#10](https://github.com/habibiahmada/wrapyourgit/pull/10)).

### Removed

- Twelve sound effects left from the old story that the ride never played. The story fetched them on the first tap anyway; each visitor now downloads about 800 KB less ([#157](https://github.com/habibiahmada/wrapyourgit/issues/157)).
- Vercel Web Analytics, replaced by Cloudflare Web Analytics in [#132](https://github.com/habibiahmada/wrapyourgit/issues/132) ([#130](https://github.com/habibiahmada/wrapyourgit/issues/130)).

### Fixed

- A GitHub login that was renamed and then taken by someone else no longer shows the previous holder's public recap under the new holder's name: a lookup or a sign-in moves the old recap off that login ([#186](https://github.com/habibiahmada/wrapyourgit/issues/186)).
- A signed-in visitor on someone else's recap is sent to their dashboard after the story, instead of being asked to sign in or make their own ([#151](https://github.com/habibiahmada/wrapyourgit/issues/151)).
- A public recap no longer says "Nothing private this year" when GitHub only keeps the count from other viewers: a private count of 0 there reads "Private work isn't shown publicly" ([#149](https://github.com/habibiahmada/wrapyourgit/issues/149)).
- The story ride shows both rails again (the rail bed was painted over the far one), and the train's wheels read as round, with light tyres on the dark skirt ([#143](https://github.com/habibiahmada/wrapyourgit/issues/143)).
- On Chrome for Android the story no longer crops its sides after the username form, which had hidden the Sound button: the player measures the box it fills instead of the window ([#137](https://github.com/habibiahmada/wrapyourgit/issues/137)).
- A tap during a move is dropped instead of queued, and the tap zones no longer draw a focus box round a third of the story after a tap ([#94](https://github.com/habibiahmada/wrapyourgit/issues/94), [#96](https://github.com/habibiahmada/wrapyourgit/issues/96)).
- The site's share card no longer draws its art over the headline ([#69](https://github.com/habibiahmada/wrapyourgit/issues/69)).
- A sync that cannot reach GitHub says so instead of "Something went wrong" ([#8](https://github.com/habibiahmada/wrapyourgit/pull/8)).
- Fact chips in the Community scene wrap instead of running off the 9:16 frame ([#14](https://github.com/habibiahmada/wrapyourgit/pull/14)).

### Security

- A Content-Security-Policy allowlist on every page: scripts, frames, connections and form posts only to this site, Turnstile, the Cloudflare beacon and the story's font host; no plugins or `<base>` rewriting. Remotion's per-render usage ping to remotion.pro is blocked (ADR-0034) ([#184](https://github.com/habibiahmada/wrapyourgit/issues/184)).
- The downloadable summary card no longer counts private work by default: the share card is the public recap's card, the same as the link preview. A second card counts private work, says so on the card, and only downloads from its own button. Card file names are sanitised like the other exports (ADR-0033) ([#178](https://github.com/habibiahmada/wrapyourgit/issues/178)).
- The session, sign-in and human-check cookies are `__Host-` prefixed on HTTPS, so no other subdomain can plant or replace them, and always `Secure` in production. Signing in again ends the browser's previous session, and in production a Turnstile answer must come from this site's hostname. Everyone is signed out once by the rename ([#180](https://github.com/habibiahmada/wrapyourgit/issues/180)).
- The nightly backup runs its Postgres image pinned by digest, the policy check escapes pull request text in its annotations, a mistyped `TOKEN_ENCRYPTION_KEY` fails instead of decoding to another key, link-preview images say how long they may be cached, and the restore steps sign everyone out and re-apply deletions and hides made after the snapshot ([#182](https://github.com/habibiahmada/wrapyourgit/issues/182)).
- A signed-in visitor's new public lookups count against their account instead of their address, so one session sent from many addresses no longer gets 20 lookups an hour at each and drains the shared public token (ADR-0032).
- The last two items of the security review are closed: CI checks on Node that a tampered or truncated token never decrypts, and every session of an account can be ended at once ([#44](https://github.com/habibiahmada/wrapyourgit/issues/44)).

[Unreleased]: https://github.com/habibiahmada/wrapyourgit/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/habibiahmada/wrapyourgit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/habibiahmada/wrapyourgit/commits/v1.0.0
