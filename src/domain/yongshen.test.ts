import { describe, it, expect } from 'vitest'
import { YONGSHEN_HINTS, SHI_YONG_HINT } from './yongshen'

describe('用神口诀', () => {
  it('覆盖五类六亲且口诀非空', () => {
    const liuqin = YONGSHEN_HINTS.map((h) => h.liuqin)
    expect(liuqin).toEqual(['父母', '兄弟', '子孙', '妻财', '官鬼'])
    for (const h of YONGSHEN_HINTS) expect(h.hint.length).toBeGreaterThan(0)
  })
})

describe('世爻为用', () => {
  it('SHI_YONG_HINT 非空', () => {
    expect(SHI_YONG_HINT.length).toBeGreaterThan(0)
  })
  it('六亲口诀仍为 5 条', () => {
    expect(YONGSHEN_HINTS).toHaveLength(5)
  })
})
