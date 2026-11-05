# Changelog

All notable changes to WrapYourGit are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) from the first release.

## [Unreleased]

The 2026 edition, before its first release.

### Added

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

- Cell moves everywhere as baked 3D loops instead of live WebGL: animated WebP on the pages (a still under reduced motion) and sprite sheets in the story; the web app no longer ships three.js (ADR-0013) ([#24](https://github.com/habibiahmada/wrapyourgit/issues/24)).
- The Projects chapter shows the year's commits as a 10 × 10 waffle coloured by repository, with names, commits and shares ([#24](https://github.com/habibiahmada/wrapyourgit/issues/24)).
- The letter has a letterhead with Cell's head, a postmark, the person's own contribution strip as the rule, a motif on the paper and a signature flourish, on the web and in the letter slide ([#24](https://github.com/habibiahmada/wrapyourgit/issues/24)).
- Cell is the story's only mascot: live in five scenes with its own pose and gear, a giant faint silhouette in four, GitHub motifs (contribution cells, a branch graph) on every field, and Cell running sideways across each cut. Each archetype has its own colour, pose and public-domain photo in the web art; the 3D block cities, moon and floating cubes are gone (ADR-0012) ([#22](https://github.com/habibiahmada/wrapyourgit/issues/22)).
- Slide exports (PNG, ZIP, PDF) are frames of the story composition, so they match the story exactly (ADR-0011) ([#22](https://github.com/habibiahmada/wrapyourgit/issues/22)).
- Every page, the landing sample reel, the README and the docs show the chibi Cell; the old cube mascot is retired ([#22](https://github.com/habibiahmada/wrapyourgit/issues/22)).
- The soundtrack is more energetic: four-on-the-floor kick, sixteenth hats, a driving bass and a lead hook, on the same 120 BPM grid ([#20](https://github.com/habibiahmada/wrapyourgit/issues/20)).
- Illustrations use a matte, studio-lit finish ([#10](https://github.com/habibiahmada/wrapyourgit/pull/10)).
- The landing hero fills 90% of the viewport with the contribution graph at its base ([#10](https://github.com/habibiahmada/wrapyourgit/pull/10)).

### Fixed

- A sync that cannot reach GitHub says so instead of "Something went wrong" ([#8](https://github.com/habibiahmada/wrapyourgit/pull/8)).
- Fact chips in the Community scene wrap instead of running off the 9:16 frame ([#14](https://github.com/habibiahmada/wrapyourgit/pull/14)).

[Unreleased]: https://github.com/habibiahmada/wrapyourgit/commits/main
