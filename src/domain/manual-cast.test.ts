import { describe, it, expect } from 'vitest'
import { lineFromCoins, manualHexagram, Coin } from './manual-cast'

describe('lineFromCoins（阴=2/阳=3）', () => {
  it('三阳 → 老阳动', () => expect(lineFromCoins(['阳', '阳', '阳'])).toEqual({ yinyang: 'yang', moving: true }))
  it('三阴 → 老阴动', () => expect(lineFromCoins(['阴', '阴', '阴'])).toEqual({ yinyang: 'yin', moving: true }))
  it('一阳 → 少阳', () => expect(lineFromCoins(['阴', '阴', '阳'])).toEqual({ yinyang: 'yang', moving: false }))
  it('二阳 → 少阴', () => expect(lineFromCoins(['阴', '阳', '阳'])).toEqual({ yinyang: 'yin', moving: false }))
})
describe('manualHexagram', () => {
  it('六爻成卦（rows[0]=初爻）', () => {
    const rows: [Coin, Coin, Coin][] = [
      ['阳', '阳', '阳'], ['阴', '阴', '阳'], ['阴', '阳', '阳'], ['阴', '阴', '阴'], ['阴', '阴', '阳'], ['阴', '阴', '阳'],
    ]
    const h = manualHexagram(rows)
    expect(h).toHaveLength(6)
    expect(h[0]).toEqual({ yinyang: 'yang', moving: true })
    expect(h[3]).toEqual({ yinyang: 'yin', moving: true })
  })
  it('行数非 6 抛错', () => expect(() => manualHexagram([['阳', '阳', '阳']])).toThrow(/六爻/))
})
