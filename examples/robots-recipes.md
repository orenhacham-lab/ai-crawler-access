# robots.txt recipes

Copy-paste blocks for the three positions site owners actually take, with what each one does
**not** achieve. Tokens are as the operators publish them; see `../data/ai-crawlers.json` for the
reference each row rests on.

Check any of these against your own site before and after:

```sh
npx github:orenhacham-lab/ai-crawler-access your-site.example
```

---

## 1. Stay out of model training, stay citable in answers

The commonest intent, and the one a blanket block gets wrong. Training crawlers are refused;
the agents that fetch a page *while a person waits for an answer*, and the search crawlers whose
indexes those answers are built from, are left alone.

```
# Training corpora and model-use controls: no.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: GoogleOther
User-agent: Applebot-Extended
User-agent: Meta-ExternalAgent
User-agent: CCBot
User-agent: AI2Bot
User-agent: Diffbot
Disallow: /

# Answer-time and search crawlers, which cite and link: yes.
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Meta-WebIndexer
User-agent: Meta-ExternalFetcher
User-agent: Amazonbot
User-agent: Googlebot
User-agent: Bingbot
User-agent: Applebot
Disallow:

User-agent: *
Disallow:
```

What it does not do:

- It does not remove you from models already trained, or from Common Crawl archives already
  published. Nothing in robots.txt is retroactive.
- It does not stop `Perplexity-User`, `Meta-ExternalFetcher` or `FacebookExternalHit`: all three
  operators document that those may ignore robots.txt. The lines above are a request.
- Blocking `Google-Extended` and `Applebot-Extended` does not affect Google Search or Apple
  search results — both operators document that explicitly.

---

## 2. Allow everything, explicitly

Worth writing down rather than leaving implicit, because an empty `Disallow:` is the documented
way to say "no restrictions" and is often mistaken for a block.

```
User-agent: *
Disallow:

Sitemap: https://your-site.example/sitemap.xml
```

---

## 3. Block every AI crawler

```
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: OAI-AdsBot
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: Google-Extended
User-agent: GoogleOther
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Applebot-Extended
User-agent: Meta-ExternalAgent
User-agent: Meta-WebIndexer
User-agent: Meta-ExternalFetcher
User-agent: Meta-ExternalAds
User-agent: Amazonbot
User-agent: CCBot
User-agent: AI2Bot
User-agent: Diffbot
Disallow: /
```

What it costs, so the decision is made with open eyes: you disappear from ChatGPT search,
Claude's citations, Perplexity's sources and Meta AI's answers — the places where an AI answer
links a reader back to you — not only from training sets. And `Googlebot`, `Bingbot` and
`Applebot` are deliberately **not** in the list: blocking them removes you from Google, Bing and
Apple search, and so from AI Overviews and Copilot, which are built on those indexes.

---

## A note on `llms.txt`

`llms.txt` is a proposed convention for a Markdown map of your site aimed at language models. No
major operator documents reading it as a crawl control, so it is not part of this dataset and it
is not a substitute for any block above. Publish one if you like; do not expect it to keep anyone
out.
