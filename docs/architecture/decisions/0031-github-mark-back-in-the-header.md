# 0031. GitHub's mark is back in the header, beside a plain "Sign in"

- Status: Accepted
- Date: 2026-11-15
- Supersedes: point 2 of [0029](0029-a-look-of-our-own.md) (no GitHub logo in the site chrome)

## Context

ADR-0029 removed three signals that together made wrapyourgit.com read as a copy of GitHub's login: GitHub's exact palette, GitHub's mark in the header beside "Sign in with GitHub", and an affiliation note found only in the footer. The site got its own palette, a code icon for the repository link, and a note under the landing page's sign-in.

On 2026-11-15 Google confirmed the review: the Safe Browsing Transparency Report shows no unsafe content and Search Console lists no security issue.

The code icon is a weaker signpost than GitHub's mark. Visitors know the mark as "the source is here", many open-source sites put it in their header, and GitHub's logo guidelines allow it for linking to a project on GitHub. The risk ADR-0029 found was never the mark alone; it was the mark right beside a button saying "Sign in with GitHub".

## Decision

1. **The header's repository link uses GitHub's mark again**, on every header, named "WrapYourGit's source code on GitHub" for screen readers.
2. **The header's sign-in reads "Sign in".** Its accessible name stays "Sign in with GitHub" (the visible text starts it, WCAG 2.5.3), so nobody loses where signing in happens. The button stays in the header because public recap pages (`/<login>`) have no other way to sign in.
3. **The landing page keeps "Sign in with GitHub"** in the hero and the closing section, each with the affiliation note under it (ADR-0029 point 3).
4. Points 1, 3, 4 and 5 of ADR-0029 stand: the warm dark palette, the note, Mona Sans and the art's colours.

## Consequences

- The header points to the source the way visitors expect, and the words "with GitHub" no longer sit beside GitHub's mark.
- If Chrome's warning returns, the first step back is to take the mark out of the public header (`variant="public"`) and keep it on the signed-in one, which has no sign-in button.
