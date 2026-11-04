# Roadmap

Milestones and status. Update the **Status** column as work lands.

Working mode: maintainer + AI agent, daily. Dates are targets, not promises.

| #   | Milestone                                                                                | Target       | Status                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M0  | Scaffold, docs, repo                                                                     | Nov 4        | ✅ Done                                                                                                                                                                              |
| M1  | **Spike A: GitHub data.** One real account → valid RecapData JSON                        | Nov 5–7      | ✅ Done Nov 4: schema-valid RecapData with both a classic and a GitHub App token; totals match github.com; calendar-day rules and App token limits documented (metrics.md, ADR-0006) |
| M1  | **Spike B: Video.** 4 scenes × 4 formats rendered locally and once on Lambda, with audio | Nov 5–9      | 🟡 4 scenes × 4 formats render locally with real data and a beat-synced placeholder track (Nov 4, cuts within 5 ms of the kick); Lambda render pending AWS setup                     |
| M2  | Auth (GitHub App), DB schema (Drizzle), sync pipeline, token encryption                  | Nov 10–14    | ✅ Done Nov 4 locally: GitHub App sign-in with PKCE, encrypted tokens + refresh, hashed sessions, sync to Postgres, dashboard, story player, delete my data. Not yet on staging      |     |
| M3  | Full analytics: languages, repos, community, engineering, archetypes + tests             | Nov 12–18    | ✅ Done Nov 4: archetypes scored with documented minimums and strengths, shown on the dashboard; references tuned on one real account, re-tune in beta (M6)                          |     |
| M4  | Design system + all 9 scenes + soundtrack sync                                           | Nov 17–28    | ✅ Done Nov 4: DESIGN.md, all 9 scenes from timeline.ts, original 66 s track with climax on identity, private repos redacted in scenes                                               |     |
| M5  | Export flow (Lambda jobs, progress UI, S3 download), PNG card, public page               | Nov 24–Dec 3 |                                                                                                                                                                                      |
| M6  | Staging beta (Vercel + Neon), fixes, security review                                     | Dec 1–10     |                                                                                                                                                                                      |
| M7  | Production launch on AWS (provisional 2026 recaps)                                       | ~Dec 15      |                                                                                                                                                                                      |
| M8  | Final 2026 recaps after year end, P1 features                                            | Jan 2027     |                                                                                                                                                                                      |

## Spike exit criteria

**Spike A (data):** `scripts/spike-github.ts` produces RecapData that passes `recapDataSchema.parse()` for the maintainer's account; numbers match github.com profile within documented caveats; every metric in metrics.md is marked feasible / estimated / not feasible.

**Spike B (video):** `wrap-9x16`, `wrap-4x5`, `wrap-1x1`, `wrap-16x9` render with no clipped or overflowing text; audio in sync; one Lambda render measured (time + cost), recorded in ADR-0004.

## Open questions

- AWS cost after credits expire on Dec 31 while January is peak season (ADR-0005).
- Soundtrack source and licence (ADR-0007).
