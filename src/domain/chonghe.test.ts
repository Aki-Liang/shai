import { describe, it, expect } from 'vitest'
import { chong, he } from './chonghe'
import { DiZhi } from './wuxing'

describe('chonghe', () => {
  it('六冲全真（无序）', () => {
    const pairs: [DiZhi, DiZhi][] = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']]
    for (const [a, b] of pairs) {
      expect(chong(a, b)).toBe(true)
      expect(chong(b, a)).toBe(true)
    }
  })
  it('六合全真（无序）', () => {
    const pairs: [DiZhi, DiZhi][] = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']]
    for (const [a, b] of pairs) {
      expect(he(a, b)).toBe(true)
      expect(he(b, a)).toBe(true)
    }
  })
  it('非冲非合 / 同支 为假', () => {
    expect(chong('子', '丑')).toBe(false)
    expect(he('子', '午')).toBe(false)
    expect(chong('子', '子')).toBe(false)
    expect(he('午', '午')).toBe(false)
  })
})
