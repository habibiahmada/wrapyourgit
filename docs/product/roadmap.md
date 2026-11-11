# Roadmap

Milestones and status. Update the **Status** column as work lands.

Working mode: maintainer + AI agent, daily. Dates are targets, not promises.

| #   | Milestone                                                                                    | Target       | Status                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Scaffold, docs, repo                                                                         | Nov 4        | ✅ Done                                                                                                                                                                                                                                                                                     |
| M1  | **Spike A: GitHub data.** One real account → valid RecapData JSON                            | Nov 5–7      | ✅ Done Nov 4: schema-valid RecapData with both a classic and a GitHub App token; totals match github.com; calendar-day rules and App token limits documented (metrics.md, ADR-0006)                                                                                                        |
| M1  | **Spike B: Video.** 4 scenes × 4 formats rendered locally, with audio                        | Nov 5–9      | ✅ Done: 4 scenes × 4 formats render locally with real data and a beat-synced placeholder track (Nov 4, cuts within 5 ms of the kick); Lambda dropped Nov 10, exports render in the browser (ADR-0016)                                                                                      |
| M2  | Auth (GitHub App), DB schema (Drizzle), sync pipeline, token encryption                      | Nov 10–14    | ✅ Done Nov 4 locally; **live in production on Vercel + Neon since Nov 5** (ADR-0015): GitHub App sign-in with PKCE, encrypted tokens + refresh, hashed sessions, sync to Postgres, dashboard, story player, delete my data                                                                 |
| M3  | Full analytics: languages, repos, community, engineering, archetypes + tests                 | Nov 12–18    | ✅ Done Nov 4: archetypes scored with documented minimums and strengths, shown on the dashboard; references tuned on one real account, re-tune in beta (M6)                                                                                                                                 |     |
| M4  | Design system + all 9 scenes + soundtrack sync                                               | Nov 17–28    | ✅ Done Nov 4 (3D illustration, guided story, letter, PNG/PDF export added the same day): DESIGN.md, all 9 scenes from timeline.ts, original 66 s track with climax on identity, private repos redacted in scenes                                                                           |     |
| M5  | Export flow in the browser (ADR-0016), PNG card, public page                                 | Nov 24–Dec 3 | ✅ Done Nov 11: MP4, slides, ZIP and PDF render in the browser (ADR-0016); every username has a public recap at `/<username>` with its card and OG image (ADR-0019, #68); private names follow the owner (ADR-0017)                                                                         |
| M6  | Beta on the live site, fixes, security review                                                | Dec 1–10     | 🟡 Live on Vercel since Nov 5 (ADR-0015). Security review: nothing open. Nov 11: first public fetch bounded, stars gained from star history (ADR-0020, #72). Open: usage monitoring and the backup policy (deployment guide, "Backups and monitoring"), the firewall rule for `/<username>` |
| M7  | Move production to AWS when needed; exports no longer need it (ADR-0005, ADR-0015, ADR-0016) | ~Dec 15      |                                                                                                                                                                                                                                                                                             |
| M8  | Final 2026 recaps after year end, P1 features                                                | Jan 2027     |                                                                                                                                                                                                                                                                                             |

## Spike exit criteria

**Spike A (data):** `scripts/spike-github.ts` produces RecapData that passes `recapDataSchema.parse()` for the maintainer's account; numbers match github.com profile within documented caveats; every metric in metrics.md is marked feasible / estimated / not feasible.

**Spike B (video):** the story renders in all four formats with no clipped or overflowing text, and the audio stays in sync. The Lambda render it once called for was dropped: the files render in the browser (ADR-0016).

## Open questions

- AWS cost after credits expire on Dec 31 while January is peak season (ADR-0005).
- Soundtrack source and licence (ADR-0007).
