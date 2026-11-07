# Contributing

The bar for a row in `data/ai-crawlers.json` is one thing:

> **a page published by the crawler's own operator that names the product token.**

Not a blog post about AI bots, not another list, not a log file, not a support thread. If the
operator does not document the token, the row belongs in `candidates_awaiting_a_reference`, where
it is honest about why.

## Adding or correcting a crawler

1. Edit `data/ai-crawlers.json`. Fields are described in `data/ai-crawlers.schema.json`.
2. Set `docs` to the operator page, and `verified` to the date you read it (`YYYY-MM-DD`).
3. Where the operator says something a user of this data would get wrong otherwise — "this token
   crawls nothing", "this one may ignore robots.txt" — put it in `note`, close to their wording.
4. Regenerate the CSV if you changed the JSON, and run `npm test` — a test pins the JSON, the CSV and
   the list the library exports to each other, so a half-finished edit fails loudly.
5. In the pull request, quote the sentence from the operator's page that supports the change.

## Moving a candidate into the dataset

That is the most useful pull request this repo can get. Add `docs` and `verified`, move the row,
quote the operator.

## Changing the matcher

`src/robots.js` implements RFC 9309. Every behaviour change needs a test in
`test/robots.test.js` that fails before it and passes after, and a reference to the clause in
RFC 9309 you are following.

## What this repo will not take

- A token sourced only from another list, or only from server logs.
- Marketing links, badges, or a "sponsored by" row in the data.
- A dependency. The library is zero-dependency on purpose.
