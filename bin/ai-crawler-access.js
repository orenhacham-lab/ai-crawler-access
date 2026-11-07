#!/usr/bin/env node
/** `npx ai-crawler-access example.com [--path /blog/] [--json]` */
import { checkRobots, summarize } from '../src/index.js'
import { fetchRobots } from '../src/fetch.js'

const args = process.argv.slice(2)
const json = args.includes('--json')
const pathIdx = args.indexOf('--path')
const path = pathIdx >= 0 ? (args[pathIdx + 1] ?? '/') : '/'
const domain = args.find((a) => !a.startsWith('--') && a !== path)

if (!domain) {
  console.error('usage: ai-crawler-access <domain> [--path /some/path] [--json]')
  process.exit(2)
}

const got = await fetchRobots(domain)
if (!got.ok) {
  console.error(got.error === 'not_robots' ? `${domain}: served HTML instead of robots.txt` : `${domain}: unreachable`)
  process.exit(1)
}

const verdicts = checkRobots(got.text, path)
const sum = summarize(verdicts)

if (json) {
  console.log(JSON.stringify({ domain, path, robots: got.state, bytes: got.bytes, verdicts, summary: sum }, null, 2))
} else {
  const state = got.state === 'absent' ? 'no robots.txt (nothing is blocked)' : `${got.bytes} bytes`
  console.log(`\n${domain}${path}  —  ${state}\n`)
  for (const v of verdicts) {
    const mark = v.allowed ? 'allowed' : 'BLOCKED'
    const why = v.rule ? `  ← ${v.rule.kind}: ${v.rule.pattern} (line ${v.rule.line}, ${v.source} group)` : ''
    // A token no operator documents, and one whose operator says it may ignore
    // robots.txt, both make the verdict a statement about the request rather
    // than about what the crawler will do. The line says so.
    const caveat = !v.documented ? '  (undocumented token)' : v.respectsRobots === false ? '  (may ignore robots.txt)' : ''
    console.log(`  ${mark.padEnd(8)} ${v.token.padEnd(22)} ${v.operator} · ${v.purpose}${why}${caveat}`)
  }
  console.log(`\n  ${sum.allowed} allowed, ${sum.blocked} blocked`)
  if (sum.trafficBlocked.length) {
    console.log(`  Blocked crawlers that bring visitors or citations: ${sum.trafficBlocked.join(', ')}`)
  } else if (sum.blocksTrainingOnly) {
    console.log('  Training is blocked, discovery is open. That is usually the intended choice.')
  }
  console.log()
}
