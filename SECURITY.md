# Security policy

WrapYourGit signs people in with GitHub and stores their access tokens, so security reports are taken seriously and handled first.

## Supported versions

Only the latest version on `main`, which is what runs at [wrapyourgit.habibiahmada.dev](https://wrapyourgit.habibiahmada.dev), receives fixes.

## Reporting a vulnerability

**Please do not open a public issue.** Instead:

1. Use GitHub's [private vulnerability reporting](https://github.com/habibiahmada/wrapyourgit/security/advisories/new) for this repository, or
2. Contact the maintainer privately through [habibiahmada.dev](https://habibiahmada.dev).

Include what you found, how to reproduce it, and what an attacker could do with it. Do not include real tokens or other people's data.

You can expect an acknowledgement within 3 days and an assessment within 7. Once a fix ships, you will be credited in the changelog unless you prefer otherwise.

## What is in scope

- Exposure of GitHub tokens, session cookies or encryption keys.
- Anything that reveals private repository names, or another user's data, on a public page, card, slide or video.
- Authentication or authorisation flaws in sign-in, sync, sharing or account deletion.
- Injection, request forgery, or server-side request forgery in the web app.

## Out of scope

- Reports that require a compromised device or browser.
- Missing security headers without a demonstrated impact.
- Rate limiting of GitHub's own API.

## How the app protects data

GitHub tokens are encrypted at rest with AES-256-GCM and never sent to the browser; sign-in asks GitHub for no repository permissions; public recaps are built from a projection that removes private repository names, the timezone and commit hours; and "Delete my data" removes everything and revokes the app's GitHub access. Details: [privacy policy](https://wrapyourgit.habibiahmada.dev/privacy), [ADR-0006](docs/architecture/decisions/0006-github-app-auth.md) and the [security review](docs/security/2026-11-04-review.md).
