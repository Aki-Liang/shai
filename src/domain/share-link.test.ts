import { describe, it, expect } from 'vitest'
import { encodeShareLink, decodeShareLink } from './share-link'
import { Hexagram, Line } from './types'

const line = (yinyang: 'yin' | 'yang', moving = false): Line => ({ yinyang, moving })
const lines: Hexagram = [line('yang', true), line('yin'), line('yang'), line('yin', true), line('yang'), line('yin')]
// 用 ASCII payload 构造任意（含非法）分享串
const b64url = (obj: unknown) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('share-link encode/decode', () => {
  it('往返还原 question/lines/createdAt（含中文）', () => {
    const enc = encodeShareLink({ question: '我能成吗？', lines, createdAt: 1750000000000 })
    const rec = decodeShareLink(enc)
    expect(rec).not.toBeNull()
    expect(rec!.question).toBe('我能成吗？')
    expect(rec!.createdAt).toBe(1750000000000)
    expect(rec!.lines).toEqual(lines)
    expect(rec!.mode).toBe('cyber')
  })
  it('base64url 不含 + / =', () => {
    const enc = encodeShareLink({ question: 'a'.repeat(60), lines, createdAt: 1 })
    expect(enc).not.toMatch(/[+/=]/)
  })
  it('空串 / 非法 base64 / 坏 JSON → null', () => {
    expect(decodeShareLink('')).toBeNull()
    expect(decodeShareLink('@@@not-base64@@@')).toBeNull()
    expect(decodeShareLink(b64url('not an object'))).toBeNull()
  })
  it('版本不符 / 缺字段 / lines 长度错 → null', () => {
    expect(decodeShareLink(b64url({ v: 9, q: 'x', t: 1, l: lines.map(() => [1, 0]) }))).toBeNull()
    expect(decodeShareLink(b64url({ v: 1, t: 1, l: lines.map(() => [1, 0]) }))).toBeNull()
    expect(decodeShareLink(b64url({ v: 1, q: 'x', t: 1, l: [[1, 0]] }))).toBeNull()
    expect(decodeShareLink(b64url({ v: 1, q: 'x', t: 'no', l: lines.map(() => [1, 0]) }))).toBeNull()
  })
})
