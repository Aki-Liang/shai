import { describe, it, expect } from 'vitest'
import { PALACE_HEADS, PALACE_VARIANTS } from '../data/palace-tables'
import { hexagrams } from '../data/hexagrams'
import { palaceOf } from './palace'

const keyOf = (lines: boolean[]) => lines.map((b) => (b ? '1' : '0')).join('')

describe('八宫定宫', () => {
  it('构造法覆盖全部 64 卦且键唯一', () => {
    const keys = new Set<string>()
    for (const head of PALACE_HEADS)
      for (const v of PALACE_VARIANTS) {
        const lines = head.lines.map((b, i) => (v.flips.includes(i + 1) ? !b : b))
        keys.add(keyOf(lines))
      }
    expect(keys.size).toBe(64)
  })
  it('每卦世位与数据集 shiYao 对齐', () => {
    for (const head of PALACE_HEADS)
      for (const v of PALACE_VARIANTS) {
        const lines = head.lines.map((b, i) => (v.flips.includes(i + 1) ? !b : b))
        const hex = hexagrams.find((h) => keyOf(h.lines) === keyOf(lines))
        expect(hex, `缺卦 ${keyOf(lines)}`).toBeTruthy()
        expect(hex!.shiYao).toBe(v.shiYao)
      }
  })
  it('palaceOf 返回宫与宫五行', () => {
    expect(palaceOf([true, true, true, true, true, true]).element).toBe('金') // 乾为天
    expect(palaceOf([false, false, false, false, false, false]).element).toBe('土') // 坤为地
    // 天风姤（初阴余阳）→ 乾宫
    expect(palaceOf([false, true, true, true, true, true]).trigram).toBe('乾')
  })
})
