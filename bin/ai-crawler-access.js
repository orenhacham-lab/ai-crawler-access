#!/usr/bin/env node
/** `npx ai-crawler-access example.com [--path /blog/] [--fix] [--json]` */
import { checkRobots, summarize, allowPlan } from '../src/index.js'
import { fetchRobots } from '../src/fetch.js'

const args = process.argv.slice(2)
const json = args.includes('--json')
const fix = args.includes('--fix')
const pathIdx = args.indexOf('--path')
const path = pathIdx >= 0 ? (args[pathIdx + 1] ?? '/') : '/'
const domain = args.find((a) => !a.startsWith('--') && a !== path)

if (!domain) {
  console.error('usage: ai-crawler-access <domain> [--path /some/path] [--fix] [--json]')
  process.exit(2)
}

const got = await fetchRobots(domain)
if (!got.ok) {
  console.error(got.error === 'not_robots' ? `${domain}: served HTML instead of robots.txt` : `${domain}: unreachable`)
  process.exit(1)
}

const verdicts = checkRobots(got.text, path)
const sum = summarize(verdicts)
const plan = allowPlan(verdicts)

if (json) {
  console.log(JSON.stringify({ domain, path, robots: got.state, bytes: got.bytes, verdicts, summary: sum, fix: plan }, null, 2))
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
  /* `--fix` is the other half of the answer: the file says what is blocked, and
     this says what to write. It is printed only when asked for, because a
     checker that volunteers edits to someone's robots.txt is a checker nobody
     trusts with a domain they do not own. */
  if (fix) {
    if (plan.lines) {
      console.log('  Paste these lines into your robots.txt to let them back in:\n')
      for (const line of plan.lines.trimEnd().split('\n')) console.log(line === '' ? '' : `    ${line}`)
      console.log('\n  An empty Disallow: means "no restrictions", and a group that names a')
      console.log('  crawler replaces the * group for it, so the catch-all stops applying.')
      console.log()
    }
    for (const e of plan.edit) {
      const where = e.rule ? ` (line ${e.rule.line}: ${e.rule.kind}: ${e.rule.pattern})` : ''
      console.log(`  ${e.token} is blocked by a group that already names it${where}.`)
      console.log('  Adding another group would merge with it and change nothing: edit that line.')
      console.log()
    }
    if (!plan.lines && plan.edit.length === 0) {
      console.log('  Nothing to fix: no documented search or answer crawler is blocked.\n')
    }
  } else if (sum.trafficBlocked.length) {
    console.log('  Run again with --fix to see the lines that let them back in.')
  }
  console.log()
}
