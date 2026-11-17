# 0032. A signed-in visitor's lookups count against them, not their address

- Status: Accepted
- Date: 2026-11-17
- Supersedes: the client limit's key for signed-in requests in point 2 of [0026](0026-a-human-check-before-a-new-public-fetch.md) (a signed-in visitor still counts as a person)

## Context

ADR-0026 put a human check in front of every new public fetch. The threat was a script with many addresses: the limit of 20 new lookups an hour counted addresses, so a hundred addresses gave two thousand lookups and could hold `GITHUB_PUBLIC_TOKEN` at its floor. An anonymous pass is bound to the address that earned it, so that script needs one Turnstile solve per address.

A signed-in visitor skips the check (point 2), yet their lookups were still counted by address. A session cookie is not bound to an address. One cookie, from any GitHub account, could therefore be sent from many addresses, and each address got a fresh 20 lookups with no check at all. A security audit on 2026-11-17 reproduced it locally: one session from 10 addresses started 200 lookups. An anonymous script started none.

## Decision

1. **The limit counts the signed-in user, from any address.** `lookupSubject(address, userId)` in `server/public-policy.ts` is the user's id when there is a session, and the address otherwise. `lookupKey(headers, userId)` in `server/public-recaps.ts` hashes that subject with the same salt as before. `VisitorRecap` passes the session's user id.
2. **A NUL keeps the two apart.** The user's subject is `user\0<id>`. No header value can carry a NUL, so an address can never pose as a user.
3. **The pass stays bound to the address.** `clientKey(headers)` is unchanged and is still what a Turnstile pass signs. Only the lookup limit changes.
4. **Signed in still means a person.** A visitor who is signed in still skips the check. They now share one limit of 20 new lookups an hour across every address they use.

## Alternatives considered

- **Ask signed-in visitors to pass the check too.** It would close the gap, but it puts a check in front of the people who have proved the most, and the limit would still be per address.
- **Count both the user and the address.** That is two rows and two locks per lookup. It adds nothing: the user's own bucket already caps the session, and an anonymous request has no user.
- **Bind the session to an address.** It would sign people out when their phone changes networks, and it does not fit a 30-day cookie.

## Consequences

- One GitHub account starts at most 20 new public lookups an hour, wherever it signs in from. Spreading one account's lookups over many addresses no longer pays.
- A signed-in visitor on a shared address (an office, a mobile carrier) no longer uses up the limit of anonymous people on that address, and the other way round.
- The many-account attack is unchanged: N GitHub accounts still get 20 × N. Making GitHub accounts costs an attacker more than rotating addresses, and the edge limit and the token's floor still apply.
- `public_lookups.client` now holds hashes of user subjects as well as addresses. Both are salted and both expire with the window.
