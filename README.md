# ai-crawler-access

Check which AI crawlers a site's `robots.txt` allows or blocks — **and which line in the file decided it**.

Zero dependencies. No build step. No network except the one request that fetches `robots.txt`.

```bash
npx github:orenhacham-lab/ai-crawler-access nytimes.com
```

(Not on npm yet, so the GitHub form is the one that works today.)

```
nytimes.com/  —  8547 bytes

  BLOCKED  GPTBot                 OpenAI · train   ← disallow: / (line 233, agent group)
  BLOCKED  OAI-SearchBot          OpenAI · search  ← disallow: / (line 266, agent group)
  BLOCKED  ChatGPT-User           OpenAI · answer  ← disallow: / (line 177, agent group)
  allowed  OAI-AdsBot             OpenAI · ads
  ...
```

## Why another robots.txt parser

Because the useful answer is not *"blocked"*. It is *"blocked, because of this line, in this group"*.

Every parser we tried returns the boolean and throws the provenance away — and the provenance is the whole reason anyone believes the verdict instead of re-reading their own file. So the matcher returns the deciding rule, with its line number.

## The distinction this tool exists to make

`robots.txt` treats every crawler as one kind of thing. They are not:

| purpose | what it means | what blocking it costs you |
|---|---|---|
| `train` | collecting a corpus for a future model | nothing, in discovery terms — a legitimate editorial choice |
| `search` | building the index behind an assistant's answers | **you leave the index your customers are searching** |
| `answer` | fetching your page *while a person waits for an answer* | **you lose the citation and the click** |
| `ads` | checking an advert's landing page | — |

Blocking `GPTBot` is a decision about training. Blocking `OAI-SearchBot` is a decision about whether you exist inside ChatGPT. Most files that block one block the other, usually because of a line inherited from a template or a plugin rather than a decision anyone made.

`summarize()` exposes exactly this:

```js
import { checkRobots, summarize } from 'ai-crawler-access'

const verdicts = checkRobots(robotsText, '/')
summarize(verdicts)
// { allowed, blocked, trafficBlocked: ['OAI-SearchBot'], blocksTrainingOnly: false }
```

## What we measured with it

Run across **the 100 highest-ranked domains per market** from the [Tranco](https://tranco-list.eu/) top-1M list, over seven markets (`.com`, `.de`, `.fr`, `.es`, `.it`, `.jp`, `.nl`), on **2026-11-07**. 528 of 700 sites served a readable `robots.txt`.

| | share of 528 |
|---|---|
| block `GPTBot` (training) | 30.5% |
| block `OAI-SearchBot` (ChatGPT's search index) | 16.5% |
| block `ChatGPT-User` (live answer fetch) | 20.3% |
| block at least one traffic-bringing AI crawler | 20.5% |
| block an AI traffic crawler **while allowing Googlebot** | 17.2% |

**Of the 161 sites that block `GPTBot`, 66.5% also block a crawler that brings traffic.** Two thirds of the sites opting out of training are also, apparently without intending to, opting out of being found.

*Limitation, stated plainly: these are high-ranking sites, not small businesses. The figures describe the leading sites in each market and should not be read as a picture of small-business websites.*

Reproduce it yourself — the matcher is pure, so the only variable is your sample.

## The four rules that are easy to get wrong

The matcher is written to [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html), and the test suite pins each of these:

1. **Group selection is exact, not a prefix.** A group for `Google-Extended` does *not* govern `Googlebot`. Prefix matching is the classic bug that reports a site as blocking Google when it blocks one Google product.
2. **`*` is a fallback, not an addition.** If any group names the crawler, the `*` group is ignored entirely. A file whose `*` group disallows everything and whose `GPTBot` group is empty **allows GPTBot everywhere**.
3. **Longest match wins, and `Allow` breaks the tie.** `Disallow: /blog/` plus `Allow: /blog/public/` allows `/blog/public/x`.
4. **An empty `Disallow:` allows everything.** Reading it as a zero-length prefix inverts the file's meaning completely.

## API

```bash
npm install github:orenhacham-lab/ai-crawler-access
```

```js
import { checkRobots, summarize, parseRobots, isAllowed, AI_CRAWLERS } from 'ai-crawler-access'

checkRobots(robotsText, path?)   // CrawlerVerdict[] — every known AI crawler
summarize(verdicts)              // counts + which blocked crawlers cost traffic
parseRobots(text)                // groups and rules, with line numbers
isAllowed(parsed, token, path)   // { allowed, source, decidedBy }
AI_CRAWLERS                      // the reference list, read from data/ai-crawlers.json
```

Everything except `fetchRobots` is a pure function of the text: no network, no clock, no environment.

```bash
npx github:orenhacham-lab/ai-crawler-access example.com --path /blog/ --json
```

## Requirements

Node 18.17+. Plain JavaScript, no dependencies, no build step.

```bash
npm test
```

## The dataset

The crawler list is not written in the code. It is read from **[`data/ai-crawlers.json`](data/ai-crawlers.json)**, which is also what the hosted version renders — one source of truth, so the repo and the site cannot drift apart. A test pins them together.

| file | what it is |
|---|---|
| [`data/ai-crawlers.json`](data/ai-crawlers.json) | the table: token, operator, purpose, whether it crawls at all, whether it honours `robots.txt`, the operator page it rests on, and the date that page was read |
| [`data/ai-crawlers.csv`](data/ai-crawlers.csv) | the same rows, flat |
| [`data/ai-crawlers.schema.json`](data/ai-crawlers.schema.json) | JSON Schema for the above |

Use it without cloning anything:

```bash
curl -s https://cdn.jsdelivr.net/gh/orenhacham-lab/ai-crawler-access/data/ai-crawlers.json
```

The same table is served as an API, no key and no sign-up: `https://www.gotopseo.com/api/public/ai-crawlers` (add `?format=csv` for CSV).

**The bar for a row is a page published by the crawler's own operator that names the token.** Tokens that people really do find in their logs but that no operator documents — `Bytespider`, `cohere-ai`, `MistralAI-User`, `Timpibot`, `omgili` — are kept in a separate `candidates_awaiting_a_reference` list and marked `documented: false`, with `respectsRobots: null`. The checker still reports them, and says so beside the verdict. Nobody has committed to anything there that we could cite, so the library claims nothing.

**Licence:** the data is CC BY 4.0 ([LICENSE-DATA](LICENSE-DATA)); the code is MIT.

Corrections are the contribution this repo most wants — above all a link that moves a candidate into the dataset. See [CONTRIBUTING.md](CONTRIBUTING.md).

## robots.txt recipes

[`examples/robots-recipes.md`](examples/robots-recipes.md) has copy-paste blocks for the three positions site owners actually take, each with what it does *not* achieve.

## Hosted version

The same check with a UI, no signup: **https://www.gotopseo.com/en/ai-crawlers**

## Licence

Code: MIT — see [LICENSE](LICENSE). Data in `data/`: CC BY 4.0 — see [LICENSE-DATA](LICENSE-DATA).
