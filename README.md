# WrapYourGit

**Your year in code. Your story in motion.**

WrapYourGit turns your GitHub activity for the year into a cinematic recap: an interactive story you can play in the browser, and an MP4 with a soundtrack you can export in 9:16, 4:5, 1:1 or 16:9 and share.

> Status: **early development** for the 2026 edition. Nothing is deployed yet. See the [roadmap](docs/product/roadmap.md).

## What's in a recap

- **Your coding year:** contributions, active days, longest streak, busiest month
- **Tech DNA:** languages, weighted by what _you_ actually committed to
- **Projects:** most active repositories and new projects
- **Community impact:** stars and forks, including how many you gained this year
- **Engineering footprint:** pull requests, issues, reviews, open source contributions
- **Developer identity:** an archetype (Builder, Explorer, Collaborator…) with the evidence behind it

Every number has a written definition in [docs/analytics/metrics.md](docs/analytics/metrics.md). If GitHub doesn't give us the data, the recap says _unavailable_ and does not show a misleading 0.

## Quick start

Requires [Bun](https://bun.sh) ≥ 1.4 and Node ≥ 22.

```bash
bun install
cp .env.example apps/web/.env.local   # fill in what you need
bun run dev                           # web app on http://localhost:3000
bun run studio                        # Remotion Studio with sample data
```

Full setup, including GitHub App and AWS: [docs/development/setup.md](docs/development/setup.md).

## Project layout

| Path                 | What                                                     |
| -------------------- | -------------------------------------------------------- |
| `apps/web`           | Next.js app: landing, auth, dashboard, live story        |
| `apps/renderer`      | Remotion Lambda video rendering on AWS                   |
| `packages/schema`    | `RecapData` contract and video formats                   |
| `packages/github`    | GitHub GraphQL client and queries                        |
| `packages/analytics` | Turns raw GitHub data into `RecapData`                   |
| `packages/video`     | Remotion scenes shared by web and MP4 export             |
| `docs/`              | Product spec, architecture decisions, metric definitions |

Contributing or working with an AI agent? Start with [AGENTS.md](AGENTS.md).

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Remotion 4 · Zod 4 · PostgreSQL + Drizzle · GitHub App auth · AWS Lambda + S3 (rendering) · Bun workspaces · Biome
