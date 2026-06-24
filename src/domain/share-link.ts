import { CastRecord, isCastRecord } from './cast-record'
import { Hexagram, Line } from './types'

export const SHARE_PARAM = 's'

interface SharePayload {
  v: 1
  q: string
  t: number
  l: [number, number][] // [yang?1:0, moving?1:0] × 6
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const rem = b64.length % 4
  return rem === 0 ? b64 : b64 + '='.repeat(4 - rem)
}
function encodeUtf8Base64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}
function decodeUtf8Base64(b64: string): string {
  const binary = atob(b64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeShareLink(input: { question: string; lines: Hexagram; createdAt: number }): string {
  const payload: SharePayload = {
    v: 1,
    q: input.question,
    t: input.createdAt,
    l: input.lines.map((x) => [x.yinyang === 'yang' ? 1 : 0, x.moving ? 1 : 0]),
  }
  return toBase64Url(encodeUtf8Base64(JSON.stringify(payload)))
}

export function decodeShareLink(param: string): CastRecord | null {
  if (!param) return null
  try {
    const p = JSON.parse(decodeUtf8Base64(fromBase64Url(param))) as Partial<SharePayload>
    if (p.v !== 1) return null
    if (typeof p.q !== 'string') return null
    if (typeof p.t !== 'number' || !Number.isFinite(p.t)) return null
    if (!Array.isArray(p.l) || p.l.length !== 6) return null
    const ok = p.l.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        (pair[0] === 0 || pair[0] === 1) &&
        (pair[1] === 0 || pair[1] === 1),
    )
    if (!ok) return null
    const lines = p.l.map(
      (pair): Line => ({ yinyang: pair[0] === 1 ? 'yang' : 'yin', moving: pair[1] === 1 }),
    ) as Hexagram
    const record: CastRecord = { id: 'shared', createdAt: p.t, question: p.q, mode: 'cyber', lines }
    return isCastRecord(record) ? record : null
  } catch {
    return null
  }
}
