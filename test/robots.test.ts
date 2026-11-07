import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkRobots, summarize, isAllowed, parseRobots } from '../src/index.ts'

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
