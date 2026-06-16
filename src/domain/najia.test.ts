import { describe, it, expect } from 'vitest'
import { najiaOf } from './najia'
import { hexagrams } from '../data/hexagrams'
import { TRIGRAM_ZHI } from '../data/najia-tables'
import { zhiWuxing } from './wuxing'

describe('纳甲', () => {
  it('天风姤（下巽上乾）六爻干支', () => {
    const nj = najiaOf('巽', '乾')
    expect(nj.map((n) => n.gan + n.zhi)).toEqual(['辛丑', '辛亥', '辛酉', '壬午', '壬申', '壬戌'])
    expect(nj.map((n) => n.wuxing)).toEqual(['土', '水', '金', '火', '金', '土'])
  })
  it('全 64 卦：每爻地支属于其经卦三联表，且五行自洽', () => {
    for (const h of hexagrams) {
      const nj = najiaOf(h.lower, h.upper)
      expect(nj).toHaveLength(6)
      const lowerZhi = TRIGRAM_ZHI[h.lower].inner
      const upperZhi = TRIGRAM_ZHI[h.upper].outer
      for (let i = 0; i < 3; i++) expect(lowerZhi).toContain(nj[i].zhi)
      for (let i = 3; i < 6; i++) expect(upperZhi).toContain(nj[i].zhi)
      for (const n of nj) expect(n.wuxing).toBe(zhiWuxing(n.zhi))
    }
  })
})
