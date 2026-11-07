/**
 * Fetching a site's robots.txt. Kept apart from the matcher on purpose: the
 * matcher is pure and testable, this is the part that can fail.
 */
export type RobotsFetch =
  | { ok: true; url: string; text: string; bytes: number; state: 'found' | 'absent' }
  | { ok: false; error: 'unreachable' | 'not_robots' }

const UA = 'ai-crawler-access (+https://github.com/orenhacham-lab/ai-crawler-access)'

/** Try https://www.<domain>/robots.txt, then https://<domain>/robots.txt. */
export async function fetchRobots(domain: string, timeoutMs = 12_000): Promise<RobotsFetch> {
  const host = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  for (const base of [`https://www.${host}`, `https://${host}`]) {
    try {
      const res = await fetch(`${base}/robots.txt`, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
        headers: { 'user-agent': UA },
      })
      // 404/410 is a real answer: there is no robots.txt, so nothing is blocked.
      if (res.status === 404 || res.status === 410) {
        return { ok: true, url: `${base}/robots.txt`, text: '', bytes: 0, state: 'absent' }
      }
      if (!res.ok) continue
      const text = await res.text()
      const type = (res.headers.get('content-type') ?? '').toLowerCase()
      // A site that serves its 404 page with a 200 is the usual cause here.
      if (type.includes('html') || /^\s*<(!doctype|html)/i.test(text)) {
        return { ok: false, error: 'not_robots' }
      }
      return { ok: true, url: res.url, text, bytes: new TextEncoder().encode(text).length, state: 'found' }
    } catch {
      // Try the next host before giving up.
    }
  }
  return { ok: false, error: 'unreachable' }
}
