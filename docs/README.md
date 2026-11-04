# Docs index

| Doc                                                  | Purpose                                               | Update when                                        |
| ---------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| [product/prd.md](product/prd.md)                     | What we build and why, MVP scope (P0/P1/P2)           | Scope or priorities change                         |
| [product/roadmap.md](product/roadmap.md)             | Milestones, dates, current status                     | Weekly, or when a milestone moves                  |
| [architecture/overview.md](architecture/overview.md) | System shape, packages, data flow, environments       | A new module, service or environment appears       |
| [architecture/decisions/](architecture/decisions/)   | ADRs: one decision per file, with alternatives        | A non-trivial technical choice is made or reversed |
| [analytics/metrics.md](analytics/metrics.md)         | Definition, GitHub source and caveats of every metric | Any metric is added or its computation changes     |
| [video/scene-system.md](video/scene-system.md)       | Scenes, layouts, animation rules, audio, export       | Scenes, formats or the audio approach change       |
| [../DESIGN.md](../DESIGN.md)                         | Visual direction: palette, type, motif, dials         | The look of the story changes                      |
| [development/setup.md](development/setup.md)         | Local setup, env vars, GitHub App, AWS                | Setup steps change                                 |

**Source of truth order:** code + tests > metrics.md / ADRs > PRD. If they disagree, fix the doc in the same change.

## ADRs

| #                                                                        | Decision                                                     | Status                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------ |
| [0001](architecture/decisions/0001-bun-workspaces-monorepo.md)           | Bun workspaces monorepo, packages ship TS source             | Accepted                       |
| [0002](architecture/decisions/0002-one-composition-for-web-and-video.md) | One Remotion composition powers the web story and MP4 export | Accepted                       |
| [0003](architecture/decisions/0003-layout-families.md)                   | Four aspect ratios, three layout families                    | Accepted                       |
| [0004](architecture/decisions/0004-render-on-remotion-lambda.md)         | Render MP4 on Remotion Lambda (AWS)                          | Accepted                       |
| [0005](architecture/decisions/0005-environments-and-hosting.md)          | Vercel + Neon for dev/staging, AWS for production            | Accepted, cost review pending  |
| [0006](architecture/decisions/0006-github-app-auth.md)                   | GitHub App user authorization, no repository permissions     | Accepted                       |
| [0007](architecture/decisions/0007-soundtrack-sourcing.md)               | Soundtrack: CC0/royalty-free tracks first, generated later   | Accepted (synth track for MVP) |
