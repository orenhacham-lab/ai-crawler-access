/**
 * Which AI crawlers may read a page, and which line in robots.txt decided it.
 *
 * Everything here is a pure function of the robots.txt text. Nothing in this
 * file touches the network, the clock or the environment, which is what makes
 * the verdicts testable against a string instead of a live site.
 */
import { AI_CRAWLERS, type AiCrawler, type CrawlerPurpose } from './crawlers.ts'
import { isAllowed, normalizeCheckPath, parseRobots, type ParsedRobots, type RobotsRule } from './robots.ts'

export { AI_CRAWLERS, AI_CRAWLER_TOKENS } from './crawlers.ts'
export type { AiCrawler, CrawlerPurpose } from './crawlers.ts'
export { parseRobots, isAllowed, rulesFor, matchLength, normalizeCheckPath } from './robots.ts'
export type { ParsedRobots, RobotsGroup, RobotsRule, Verdict } from './robots.ts'

export type CrawlerVerdict = {
  token: string
  operator: string
  purpose: CrawlerPurpose
  /** True for the classic search crawlers people check in the same breath. */
  classicSearch: boolean
  /** False when the operator has not committed to honouring robots.txt. */
  respectsRobots: boolean
  allowed: boolean
  /** Which group decided: the crawler's own, the `*` fallback, or neither. */
  source: 'agent' | 'wildcard' | 'none'
  /** The deciding line, verbatim, so a reader can find it in their own file. */
  rule: RobotsRule | null
}

/** Verdicts for every known AI crawler, for one path. */
export function checkRobots(robotsText: string, path = '/'): CrawlerVerdict[] {
  const parsed: ParsedRobots = parseRobots(robotsText)
  const target = normalizeCheckPath(path)
  return AI_CRAWLERS.map((crawler: AiCrawler) => {
    const v = isAllowed(parsed, crawler.token, target)
    return {
      token: crawler.token,
      operator: crawler.operator,
      purpose: crawler.purpose,
      classicSearch: crawler.classicSearch ?? false,
      respectsRobots: crawler.respectsRobots,
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
export function summarize(verdicts: CrawlerVerdict[]) {
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
