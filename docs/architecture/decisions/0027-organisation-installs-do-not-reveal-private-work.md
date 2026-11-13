# 0027. An organisation installation does not reveal a member's private work

- Status: Accepted
- Date: 2026-11-13
- Stops: the organisation access design (`docs/superpowers/specs/2026-11-11-org-access-at-sign-in-design.md`, #77) at its Phase 0 gate
- Answers: #79

## Context

The organisation access design would send a user with restricted contributions to GitHub's installation page after sign-in, so their organisations install the WrapYourGit app with **Metadata: read** and the next sync shows that work with details. Two facts had to be proved first (#79):

1. Does such an installation move an organisation's private contributions out of `restrictedContributionsCount` and into the per-repository details, for a member's own user token?
2. When a member who is not an owner presses **Request**, does GitHub send them to the app's Setup URL, and with which `setup_action`?

## How it was tested (2026-11-13)

- Organisation **Webekspres**. `habibiahmada` is a plain **member**; `hawebekspres` is an **owner**.
- A GitHub App user token for `habibiahmada`, from the device flow (`scripts/github-app-token.ts`), measured with `scripts/spike-org-access.ts` before and after: restricted count, and contributions in the organisation per kind (commits, pull requests, reviews, issues), counting repositories and private ones, never naming them.
- The app asked for **no** repository permissions at the start, although ADR-0008 says Metadata: read; the installation page offered only "read access to public resources" with no repository picker. **Metadata: read** was added to the app before installing.
- `hawebekspres` installed the app on Webekspres for four private repositories in which `habibiahmada` has 2026 commits: 100 or more, 68, 100 or more and 8, counted with an ordinary `gh` token.

## Findings

1. **No.** After the installation the user token sees the installation (`GET /user/installations` lists Webekspres, `metadata: read`) and the four repositories (`GET /repos/...` answers 200), but `contributionsCollection` is unchanged: restricted went from 2,308 to 2,313 (new activity that day), and the organisation's commits and pull requests are still 26 and 8, in public repositories only, with **0 private** repositories. Listing a repository's commits with the same token is refused: "Resource not accessible by integration". Metadata is not enough to see contributions. Widening the installation to **all** of Webekspres's repositories, the same day, changed nothing either.
2. **No redirect.** After **Request**, the member stays on GitHub (`/apps/wrapyourgit/installations/select_target`): no Setup URL, no `installation_id`, no `setup_action`. The owner gets an email with `/apps/wrapyourgit/installations/new/permissions?request_id=…&target_id=…`, and after installing lands on GitHub's own page for the installation (`/apps/wrapyourgit/installations/<id>`), not on the Setup URL either.

## Decision

1. **The organisation access feature is stopped.** Its whole value was finding 1, and Metadata: read does not give it.
2. **No wider permission is asked for.** The next candidate, **Contents: read**, is read access to the organisation's source code. The design ruled out asking for more than Metadata: read, and ADR-0006 rejected code access for sign-in; reading code to count commits is not a trade this product makes. It was not tested.
3. **The app keeps Metadata: read**, now that it has it: it is what ADR-0008 describes, and it lets the optional personal installation see the user's own private repositories by name. The Webekspres installation stays only as long as the maintainer wants it; it changes nothing in recaps.
4. Restricted contributions stay one labelled number, as today.

## Consequences

- Users whose year is mostly private organisation work keep seeing it as a single "private work" count. The story already says what that number is.
- The design document is marked stopped, with a pointer here.
- If GitHub ever exposes private contribution details to Metadata or another non-code permission, this decision can be revisited with the same script.
