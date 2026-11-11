/**
 * The AI user-agents this checker asks about, and what each one is FOR.
 *
 * The rows are NOT written here. They are read from `data/ai-crawlers.json`,
 * which is the published dataset (CC BY 4.0) and the same table the hosted
 * version renders. One source of truth is the point: a list retyped in code
 * drifts from the dataset within a month, and a reader who notices the two
 * disagreeing is right to distrust both.
 *
 * `purpose` is the distinction that makes the answer useful rather than a row
 * of dots. Blocking a `train` agent and blocking an `answer` agent are opposite
 * decisions: the first keeps your pages out of a future model, the second keeps
 * them out of an answer a person is being shown RIGHT NOW with a citation and a
 * link back. A file that blocks everything because "AI bad" usually meant only
 * the first.
 *
 * `agent` is the newest category and the one that is not a crawler at all:
 * a browser an assistant drives on one person's behalf. Blocking it blocks a
 * visitor who asked for your page, which is a different decision from every
 * other row here, and the operator of the one documented agent states that
 * robots.txt does not govern it.
 *
 * `documented: false` marks a token that no operator has published a page for.
 * Those live in the dataset's own `candidates_awaiting_a_reference` list and are
 * carried here because people do find them in their logs and want a verdict —
 * but `respectsRobots` is `null` for them, because nobody has committed to
 * anything we could cite. Asserting `true` there would be inventing a fact.
 *
 * @typedef {'train'|'answer'|'search'|'ads'|'preview'|'agent'} CrawlerPurpose
 *
 * @typedef {object} AiCrawler
 * @property {string}  token           The product token exactly as the operator publishes it.
 * @property {string}  operator        Who runs it.
 * @property {CrawlerPurpose} purpose  What the operator fetches pages for.
 * @property {boolean} crawls          False for a control-only token that fetches nothing itself.
 * @property {boolean|null} respectsRobots  Null when no operator page documents the token.
 * @property {boolean} documented      True when `docs` points at the operator's own page.
 * @property {boolean} classicSearch   True for the classic search crawlers people check alongside.
 * @property {string|null} docs        The operator page the row rests on.
 * @property {string|null} verified    The date that page was read (YYYY-MM-DD).
 * @property {string|null} note        What the operator says that a reader would otherwise get wrong.
 */
import { readFileSync } from 'node:fs'

const dataset = JSON.parse(
  readFileSync(new URL('../data/ai-crawlers.json', import.meta.url), 'utf8'),
)

/** The dataset version these rows came from, e.g. `2026.11.01`. */
export const DATASET_VERSION = dataset.version

/** @type {readonly AiCrawler[]} */
export const AI_CRAWLERS = [
  ...dataset.crawlers.map((c) => ({
    token: c.token,
    operator: c.operator,
    purpose: c.purpose,
    crawls: c.crawls !== false,
    respectsRobots: c.respects_robots,
    documented: true,
    classicSearch: c.classic_search === true,
    docs: c.docs ?? null,
    verified: c.verified ?? null,
    note: c.note ?? null,
  })),
  ...dataset.candidates_awaiting_a_reference.map((c) => ({
    token: c.token,
    operator: c.operator,
    purpose: c.purpose,
    crawls: true,
    respectsRobots: null,
    documented: false,
    classicSearch: false,
    docs: null,
    verified: null,
    note: c.why_here ?? null,
  })),
]

/** The tokens, in the dataset's reading order. */
export const AI_CRAWLER_TOKENS = AI_CRAWLERS.map((c) => c.token)
