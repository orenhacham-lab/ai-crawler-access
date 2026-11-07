import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { checkRobots, summarize, isAllowed, parseRobots, AI_CRAWLERS, DATASET_VERSION } from '../src/index.js'

// Rule 1: group selection is exact, never a prefix.
test('a Google-Extended group does not govern Googlebot', () => {
  const r = parseRobots('User-agent: Google-Extended\nDisallow: /')
  assert.equal(isAllowed(r, 'Googlebot', '/').allowed, true)
  assert.equal(isAllowed(r, 'Google-Extended', '/').allowed, false)
})

// Rule 2: `*` is a fallback, not an addition.
test('a named empty group wins over a restrictive wildcard', () => {
  const r = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\n')
  assert.equal(isAllowed(r, 'GPTBot', '/').allowed, true)
  assert.equal(isAllowed(r, 'CCBot', '/').allowed, false)
})

// Rule 3: longest match wins, Allow breaks the tie.
test('longest match wins and Allow breaks ties', () => {
  const r = parseRobots('User-agent: *\nDisallow: /blog/\nAllow: /blog/public/')
  assert.equal(isAllowed(r, 'GPTBot', '/blog/public/x').allowed, true)
  assert.equal(isAllowed(r, 'GPTBot', '/blog/private').allowed, false)
})

// Rule 4: an empty Disallow allows everything.
test('an empty Disallow allows everything', () => {
  const r = parseRobots('User-agent: *\nDisallow:')
  assert.equal(isAllowed(r, 'GPTBot', '/anything').allowed, true)
})

test('no robots.txt means nothing is blocked', () => {
  assert.ok(checkRobots('', '/').every((v) => v.allowed))
})

test('the verdict carries the line that decided it', () => {
  const v = checkRobots('User-agent: GPTBot\nDisallow: /', '/').find((x) => x.token === 'GPTBot')
  assert.equal(v?.allowed, false)
  assert.equal(v?.source, 'agent')
  assert.equal(v?.rule?.line, 2)
})

test('summarize separates training from discovery', () => {
  const trainingOnly = summarize(checkRobots('User-agent: GPTBot\nDisallow: /', '/'))
  assert.equal(trainingOnly.blocksTrainingOnly, true)
  assert.deepEqual(trainingOnly.trafficBlocked, [])

  const searchBlocked = summarize(checkRobots('User-agent: OAI-SearchBot\nDisallow: /', '/'))
  assert.equal(searchBlocked.blocksTrainingOnly, false)
  assert.ok(searchBlocked.trafficBlocked.includes('OAI-SearchBot'))
})

// The reference list is the published dataset, not a copy of it. If these ever
// disagree, the repo and https://www.gotopseo.com/api/public/ai-crawlers are
// telling a reader two different things about the same crawler.
test('the crawler list is exactly the published dataset', () => {
  const dataset = JSON.parse(
    readFileSync(new URL('../data/ai-crawlers.json', import.meta.url), 'utf8'),
  )
  const documented = AI_CRAWLERS.filter((c) => c.documented).map((c) => c.token)
  const candidates = AI_CRAWLERS.filter((c) => !c.documented).map((c) => c.token)
  assert.deepEqual(documented, dataset.crawlers.map((c) => c.token))
  assert.deepEqual(candidates, dataset.candidates_awaiting_a_reference.map((c) => c.token))
  assert.equal(DATASET_VERSION, dataset.version)
})

// Every documented row has to carry the operator page it rests on, and the date
// that page was read. A row without them is a claim with no source.
test('every documented crawler carries its operator page and a read date', () => {
  for (const c of AI_CRAWLERS.filter((x) => x.documented)) {
    assert.match(c.docs ?? '', /^https:\/\//, `${c.token} has no docs URL`)
    assert.match(c.verified ?? '', /^\d{4}-\d{2}-\d{2}$/, `${c.token} has no read date`)
    assert.equal(typeof c.respectsRobots, 'boolean', `${c.token} should state robots.txt compliance`)
  }
})

// And the opposite guard: a token nobody documents must not claim anything.
test('an undocumented token claims nothing about robots.txt compliance', () => {
  const candidates = AI_CRAWLERS.filter((c) => !c.documented)
  assert.ok(candidates.length > 0)
  for (const c of candidates) {
    assert.equal(c.respectsRobots, null, `${c.token} must not assert compliance`)
    assert.equal(c.docs, null)
    assert.ok(c.note, `${c.token} should say why it is still here`)
  }
})

// The CSV is generated from the JSON, so it must not fall behind it.
test('the CSV holds the same tokens as the JSON', () => {
  const dataset = JSON.parse(
    readFileSync(new URL('../data/ai-crawlers.json', import.meta.url), 'utf8'),
  )
  const csv = readFileSync(new URL('../data/ai-crawlers.csv', import.meta.url), 'utf8')
  const [header, ...rows] = csv.trim().split('\n')
  assert.equal(header.split(',')[0], 'token')
  assert.deepEqual(
    rows.map((r) => r.split(',')[0]),
    dataset.crawlers.map((c) => c.token),
  )
})
