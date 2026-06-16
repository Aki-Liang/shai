import { describe, it, expect } from 'vitest'
import { hexagrams } from './hexagrams'
import { hexagramKey } from '../domain/hexagram-key'

describe('六十四卦数据集完整性', () => {
  it('恰好 64 卦', () => expect(hexagrams).toHaveLength(64))

  it('卦序 1–64 无重复', () => {
    const orders = hexagrams.map((h) => h.order).sort((a, b) => a - b)
    expect(orders).toEqual(Array.from({ length: 64 }, (_, i) => i + 1))
  })

  it('每卦六爻、六爻辞，世应位合法', () => {
    for (const h of hexagrams) {
      expect(h.lines, h.name).toHaveLength(6)
      expect(h.lineTexts, h.name).toHaveLength(6)
      expect(h.judgment.length, h.name).toBeGreaterThan(0)
      expect(h.shiYao, h.name).toBeGreaterThanOrEqual(1)
      expect(h.shiYao, h.name).toBeLessThanOrEqual(6)
      expect(h.yingYao, h.name).toBeGreaterThanOrEqual(1)
      expect(h.yingYao, h.name).toBeLessThanOrEqual(6)
    }
  })

  it('二进制键唯一且覆盖全部 64 种组合', () => {
    const keys = new Set(hexagrams.map((h) => hexagramKey(h.lines.map((b) => ({ yinyang: b ? 'yang' : 'yin' })))))
    expect(keys.size).toBe(64)
  })

  it('已知卦抽查：乾为天（六阳，世上爻应三爻）', () => {
    const qian = hexagrams.find((h) => h.name.includes('乾为天'))!
    expect(qian.lines).toEqual([true, true, true, true, true, true])
    expect(qian.shiYao).toBe(6)
    expect(qian.yingYao).toBe(3)
  })

  it('已知卦抽查：地天泰（下乾上坤 = 111000）', () => {
    const tai = hexagrams.find((h) => h.name.includes('泰'))!
    expect(tai.lines).toEqual([true, true, true, false, false, false])
  })
})
