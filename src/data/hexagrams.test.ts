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

  it('世应符合京房八宫（全 64 卦）', () => {
    const palaces: Record<string, string[]> = {
      乾宫: ['乾为天', '天风姤', '天山遯', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
      兑宫: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
      离宫: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
      震宫: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
      巽宫: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
      坎宫: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
      艮宫: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
      坤宫: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
    }
    const expShi = [6, 1, 2, 3, 4, 5, 4, 3] // 本宫/一世/二世/三世/四世/五世/游魂/归魂
    for (const names of Object.values(palaces)) {
      names.forEach((nm, i) => {
        const h = hexagrams.find((x) => x.name === nm)
        expect(h, nm).toBeTruthy()
        expect(h!.shiYao, nm).toBe(expShi[i])
        expect(h!.yingYao, nm).toBe(((expShi[i] - 1 + 3) % 6) + 1)
      })
    }
  })
})
