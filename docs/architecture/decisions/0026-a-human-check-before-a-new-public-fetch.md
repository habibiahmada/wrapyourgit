# 0026. A human check before a new public fetch

- Status: Accepted
- Date: 2026-11-13
- Builds on: [0019](0019-every-username-has-a-recap.md) (every username has a recap), [0020](0020-stars-from-star-history.md) (the first fetch is bounded)

## Context

Any address of the form `/<username>` can make the server read a year from GitHub: a lookup, then a fetch of 20 to 55 seconds, paid for from one token that every visitor shares (5,000 points an hour). Three things limited that: a stored recap is reused for 12 hours, one client may start 20 new lookups an hour, and new fetches stop when the token runs low.

A test against production on 2026-11-13 showed how thin that is. The edge rate limit answered 429 after 60 requests on `/api`, but 75 requests to a path shaped like a recap page all passed: the rule never had its third condition. And the per-client limit counts addresses, so a script with a hundred addresses gets two thousand lookups an hour and can hold the token at its floor. Real visitors then see "busy" for every recap that is not already stored.

A limit per address cannot tell a person from a script. Something has to.

The site sits behind Vercel, with Cloudflare as DNS only (deployment guide, "Why Cloudflare stays DNS-only"), so Cloudflare's firewall and its challenge pages are not available. A challenge at Vercel's edge on `/<username>` would also stop the crawlers that build link previews, for every recap, stored or not.

## Decision

1. **A request may make the server ask GitHub only when a person is known to be behind it.** `loadPublicRecapWith` takes `human`. When it is false, everything that needs no GitHub call still works: a fresh stored recap plays, a stored recap within the 7-day cap stands in, a name GitHub recently said is missing is answered as missing. Otherwise the answer is a new result, `verify`, and nothing is asked and no lookup is recorded against the client.
2. **A person is known three ways** (`server/human.ts`): they are signed in (GitHub has already vouched for more than the check asks); they hold a pass; or the check is off.
3. **The check is Cloudflare Turnstile**, which works as a widget on the page and does not need Cloudflare's proxy. The `verify` result renders a page at the recap's own address with the widget. The widget gives the page a token, the page posts it to `/api/verify`, and the server asks Cloudflare whether it is good (`verifyTurnstile`). The page never decides anything. A token that cannot be checked (network failure, timeout, a non-200 answer) is not a pass.
4. **The pass is a signed cookie, not a row.** `wyg_human` holds an expiry time and an HMAC over that time and the client's key (`clientKey()`, the salted hash of the address), signed with a key derived from `TOKEN_ENCRYPTION_KEY` under its own label. It lasts one hour, is HttpOnly, and is worth nothing from another address. Nothing is stored for it. The 20-lookups-an-hour limit still applies to a client that holds a pass.
5. **Link previews never start a fetch.** The Open Graph image asks with no session; a crawler has no pass. With the check on, a preview shows the stored recap's card, or the site's own card for a name nobody has opened. A recap someone has opened previews as before.
6. **Without the keys, the check is off.** `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are both needed; with either missing every request counts as a person's and the site behaves as it did before. A deploy can therefore go out before the keys exist, and removing the keys is the way to turn the check off in an emergency.

## Alternatives considered

- **A challenge at Vercel's edge on `/<username>`.** No code, but it challenges every request to a recap, stored ones included, and link-preview crawlers that are not on Vercel's verified list (Slack, Discord, WhatsApp and Telegram were not, on 2026-11-13) would get the challenge instead of the card. Kept as the emergency rule in the deployment guide.
- **Cloudflare's proxy in front of Vercel**, to use its firewall. It hides the visitor's address from Vercel, which breaks the per-address limits this design still relies on.
- **A lower per-client limit.** It punishes offices and mobile carriers that share an address, and does nothing against many addresses.
- **Storing passes in the database.** It would allow revoking one, which nothing needs, at the cost of a write per check and a table to clean.

## Consequences

- A visitor who is not signed in and opens a recap nobody has opened in the last 12 hours sees one extra page. Turnstile usually passes without interaction; when it asks, it is one tick.
- A shared link to a name nobody has opened previews with the site's card until a person opens it once. This is the price of point 5, and the reason the check sits before the fetch rather than in front of the page.
- A visitor whose address changes inside the hour (a phone moving between networks) is checked again.
- The check page loads a script and a frame from `challenges.cloudflare.com`. The site's Content-Security-Policy only restricts who may frame the site, so nothing else changes; a full policy, when it is written, must allow that origin.
- Cloudflare becomes a third party that sees the visitor's address and browser on the check page. The privacy page says so.
- The check stops scripts that cannot pass Turnstile. It does not stop a person, or a paid solving service, from starting 20 lookups an hour per address. The edge rate limit and the token's floor remain.
