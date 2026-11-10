# WrapYourGit 2026: Product Requirements

**Version 1.2** · November 2026 · Owner: @habibiahmada
Supersedes v1.1 (chat draft). Changes from v1.1 are listed at the bottom.

## 1. Summary

WrapYourGit turns a developer's GitHub activity for one calendar year into a personal, cinematic, shareable recap:

1. an **interactive story** in the browser, and
2. an **MP4 video** with soundtrack in four aspect ratios, plus a **PNG card** and a **public recap URL**.

Tagline: _Your year in code. Your story in motion._

## 2. Principles

1. Celebrate progress, not competition. No leaderboards in MVP.
2. Every metric has a written definition and a verifiable source ([metrics.md](../analytics/metrics.md)).
3. Missing data is shown as unavailable, and estimates are labelled.
4. Web story and video show identical numbers, which comes from sharing one composition ([ADR-0002](../architecture/decisions/0002-one-composition-for-web-and-video.md)).
5. Motion and sound must serve the story; they never hide the numbers.
6. Privacy before shareability: private repo details are never public.

## 3. Users

All GitHub users. No per-segment features in MVP; insights must make sense for low-activity students and for prolific OSS maintainers alike (archetypes have minimum thresholds and may return "none").

## 4. Decisions

| Topic           | Decision                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| Audience        | All GitHub developers                                                                   |
| Positioning     | Storytelling + developer analytics                                                      |
| Access          | GitHub sign-in required ([ADR-0006](../architecture/decisions/0006-github-app-auth.md)) |
| Platform        | Responsive web app                                                                      |
| Flagship output | Animated story + MP4 export                                                             |
| Project         | Personal, open-source intent, solo maintainer + AI agent                                |

## 5. Story structure

1. Intro: logo reveal, `@login · 2026`
2. Contributions: total, active days, longest streak
3. Rhythm: calendar heatmap, busiest month, weekday pattern, hours (estimated)
4. Tech DNA: top languages
5. Projects: top repositories, new repos
6. Community impact: stars and forks (current + gained this year)
7. Engineering footprint: PRs, merged, issues, reviews, external repos
8. Developer identity: archetype + evidence (climax)
9. Closing: summary card, share prompt

## 6. Scope

### P0: MVP (public launch)

- GitHub sign-in, sign-out, disconnect, delete my data
- Data sync for the edition year (provisional until Dec 31, final after)
- Metrics: contributions, rhythm, languages, repositories, community impact, engineering ([metrics.md](../analytics/metrics.md))
- Rule-based archetype with evidence
- Interactive story (Remotion Player), responsive, reduced-motion support
- **One** soundtrack + SFX, muted until user interaction
- MP4 export in 9:16, 4:5, 1:1, 16:9 (H.264/AAC, 30 fps, 1080p-class, 60–120 s)
- PNG summary card
- Public recap page (aggregates only, private repos redacted), OG metadata

### P1: after launch

- More soundtracks (target 4 moods: Epic Journey, Future Tech, High Energy, Chill Coding)
- AI-written year summary (grounded strictly in RecapData)
- Year-over-year comparison (2025 vs 2026)
- Private repository details and stars gained this year via GitHub App installation (opt-in, ADR-0006)
- Customisable share cards

### P2: later

Custom soundtrack upload, timeline editor, team/org recaps, multi-year timeline, AI co-author insights, leaderboards.

## 7. Non-functional requirements

- Tokens encrypted at rest, server-side only; least-privilege permissions.
- GitHub rate limits handled (per-user token, retries with backoff, cached results).
- Render jobs are async with status, retries and cleanup of old MP4s (S3 lifecycle).
- Render cost is bounded: per-user limits on renders per day.
- Mobile-first; no horizontal overflow; text legible in every format; social safe areas.
- Browser autoplay rules respected (no sound before interaction).

## 8. Success metrics

Sign-in success rate · sync success rate · story completion rate · MP4 exports per user · PNG downloads · public page shares · render failure rate · median render time.

## 9. Changes from v1.1

- **Stars/forks gained** are computable from `stargazers.starredAt` and fork `createdAt`, so no snapshots are needed (see metrics).
- **Hour-of-day / Night Owl** need per-commit timestamps and only cover what we can fetch → labelled _estimated_.
- **Languages** weighted by user's commits × repo language bytes, not raw repo bytes.
- **Live story uses Remotion Player**, not a separate Framer Motion implementation (ADR-0002).
- **Four ratios → three layout families** (ADR-0003).
- **MVP ships one soundtrack**, others in P1.
- **Hosting**: Vercel/Neon for dev+staging, AWS for production; the story's files render in the viewer's browser (ADR-0005, 0016).
