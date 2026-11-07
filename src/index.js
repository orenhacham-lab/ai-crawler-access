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
