# 0029. The web pages wear their own colours, not GitHub's

- Status: Accepted
- Date: 2026-11-14
- Supersedes: the GitHub-dark palette and the header's GitHub mark in DESIGN.md "Web" (decided 2026-11-04)

## Context

On 2026-11-14 Chrome for Android showed a full-page "Dangerous site" warning (Safe Browsing, deceptive site) on wrapyourgit.com at sign-in, on Wi-Fi and on mobile data. The domain was not on the public Safe Browsing list (Transparency Report: no data) and Search Console listed no security issue. That points to Chrome's real-time phishing check, which scores how closely a page looks like a known brand's login page.

The pages were built to feel like GitHub, and they matched GitHub closely:

- the palette was GitHub's Primer dark tokens exactly (`#0d1117`, `#161b22`, `#30363d`, `#e6edf3`, `#238636`, header `#010409`), with Mona Sans, GitHub's own face;
- GitHub's mark sat in the header beside "Sign in with GitHub", and that button leads to GitHub's login;
- "Not affiliated with GitHub" was only in the footer.

A week-old domain with GitHub's exact colours, its logo and a button to GitHub's login looks, to a classifier, like a GitHub phishing page. A false-positive report clears the verdict already given, but it does not stop the next one.

## Decision

1. **The site chrome uses a warm dark set of its own**, close to the story's ink and paper: canvas `#12110e`, head `#0b0a08`, surface `#1b1a16`, overlay `#26241f`, line `#3a372f`, fg `#eeeae0`, muted `#a29d90`, green `#4cc764`, green button `#1d7a3a`, blue `#7f93ff`. The structure stays GitHub-like (dark, boxes, one green button) because that is still the product people come from. Every text pairing meets WCAG 2.2 AA; the measured values are in DESIGN.md.
2. **No GitHub logo in the site chrome.** The header's link to the repository is a code icon named "Source code".
3. **The sign-in says who runs the site.** "An independent project, not affiliated with GitHub. Signing in happens on github.com and gives read-only access." sits under the landing page's sign-in, in the hero and the closing section.
4. **Mona Sans stays for now.** It is open source and a weak signal on its own; it can change if the warning returns.
5. **Out of scope:** the isometric illustrations, the story and the video keep their colours. They are art drawn on a canvas or in images, not the page's controls, and the contribution greens are data.

## Consequences

- The pages look less like GitHub. That is the point: familiar in structure, but plainly not GitHub.
- The share card (`server/card.tsx`) and the browser theme colour follow the new canvas.
- The maintainer files a false-positive report with Google; this change only lowers the chance of a new verdict. If the warning comes back, the next candidates are Mona Sans and the hero's GitHub-style username field.
