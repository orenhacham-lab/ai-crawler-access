/**
 * Which AI crawlers may read a page, and which line in robots.txt decided it.
 *
 * Everything here is a pure function of the robots.txt text. Nothing in this
 * file touches the network, the clock or the environment, which is what makes
 * the verdicts testable against a string instead of a live site.
 */
import { AI_CRAWLERS } from './crawlers.js'
import { isAllowed, normalizeCheckPath, parseRobots } from './robots.js'

export { AI_CRAWLERS, AI_CRAWLER_TOKENS, DATASET_VERSION } from './crawlers.js'
export { parseRobots, isAllowed, rulesFor, matchLength, normalizeCheckPath } from './robots.js'

/**
 * @typedef {import('./crawlers.js').CrawlerPurpose} CrawlerPurpose
 * @typedef {import('./robots.js').RobotsRule} RobotsRule
 *
 * @typedef {object} CrawlerVerdict
 * @property {string} token
 * @property {string} operator
 * @property {CrawlerPurpose} purpose
 * @property {boolean} classicSearch   True for the classic search crawlers people check alongside.
 * @property {boolean|null} respectsRobots  False when the operator has not committed to robots.txt;
 *   null when no operator page documents the token at all.
 * @property {boolean} documented      False for a token no operator has published a page for.
 * @property {boolean} allowed
 * @property {'agent'|'wildcard'|'none'} source  Which group decided: the crawler's own, `*`, or neither.
 * @property {RobotsRule|null} rule    The deciding line, verbatim, so a reader can find it in their file.
 */

/**
 * Verdicts for every known AI crawler, for one path.
 * @param {string} robotsText
 * @param {string} [path]
 * @returns {CrawlerVerdict[]}
 */
export function checkRobots(robotsText, path = '/') {
  const parsed = parseRobots(robotsText)
  const target = normalizeCheckPath(path)
  return AI_CRAWLERS.map((crawler) => {
    const v = isAllowed(parsed, crawler.token, target)
    return {
      token: crawler.token,
      operator: crawler.operator,
      purpose: crawler.purpose,
      classicSearch: crawler.classicSearch ?? false,
      respectsRobots: crawler.respectsRobots,
      documented: crawler.documented,
      allowed: v.allowed,
      source: v.source,
      rule: v.decidedBy,
    }
  })
}

/**
 * The distinction that matters, and that most robots.txt files miss.
 *
 * `train` is a corpus for a future model: blocking it is an editorial choice
 * with no effect on whether anyone can find you. `search` and `answer` are how
 * an assistant finds and cites you while a person is waiting. Blocking those
 * removes you from the answer, which is rarely what the author intended.
 */
/** @param {CrawlerVerdict[]} verdicts */
export function summarize(verdicts) {
  const blocked = verdicts.filter((v) => !v.allowed)
  const trafficBlocked = blocked.filter((v) => v.purpose === 'search' || v.purpose === 'answer')
  return {
    allowed: verdicts.length - blocked.length,
    blocked: blocked.length,
    /** Blocked crawlers that would have brought a visitor or a citation. */
    trafficBlocked: trafficBlocked.map((v) => v.token),
    /** True when training is blocked and discovery is deliberately left open. */
    blocksTrainingOnly: blocked.length > 0 && trafficBlocked.length === 0,
  }
}

/**
 * How to let the blocked traffic-bringing crawlers back in, which is the
 * commoner accident and the one nothing else here answered.
 *
 * `Disallow:` with nothing after it is robots.txt's own way of saying "no
 * restrictions" (rule 4 in `src/robots.js`), and because a crawler is governed
 * by exactly one group (rule 2), a group that names it REPLACES the `*` group
 * for it. Those two rules together are the entire fix for a site that blocked
 * an answer crawler through a catch-all it aimed at every bot alike.
 *
 * The same two rules are why this function splits its answer in half:
 *
 * - `paste` — the block came from the `*` group, so the two lines below are all
 *   it takes. The named group wins and the catch-all stops applying to it.
 * - `edit` — the block came from a group that already names the crawler. Adding
 *   a second group MERGES with it, so the existing `Disallow: /` stays in force
 *   and these lines would change nothing. The line that decided it is named,
 *   with its number, because that line is what has to go.
 *
 * Deliberately left out of both lists: classic search crawlers, which are not
 * AI crawlers and whose rules are not ours to rewrite; tokens no operator
 * documents, because writing a group for a guess puts the guess in someone's
 * file; and crawlers whose operator states they may ignore robots.txt, where an
 * allow line would be a reassurance nobody has promised to honour.
 *
 * @param {CrawlerVerdict[]} verdicts
 */
export function allowPlan(verdicts) {
  const candidates = verdicts.filter(
    (v) =>
      !v.allowed &&
      !v.classicSearch &&
      v.documented &&
      v.respectsRobots !== false &&
      (v.purpose === 'search' || v.purpose === 'answer'),
  )
  const paste = candidates.filter((v) => v.source !== 'agent')
  const edit = candidates
    .filter((v) => v.source === 'agent')
    .map((v) => ({ token: v.token, rule: v.rule }))
  const lines = paste.length
    ? paste.map((v) => `User-agent: ${v.token}\nDisallow:`).join('\n\n') + '\n'
    : ''
  return { lines, paste: paste.map((v) => v.token), edit }
}
