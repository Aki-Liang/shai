import { describe, it, expect } from 'vitest'
import { fushenOf } from './fushen'
import { najiaOf } from './najia'
import { liuqinOf } from './liuqin'

// 天风姤六爻六亲（金宫）= 父母/子孙/兄弟/官鬼/兄弟/父母，缺妻财
const gouLines = [false, true, true, true, true, true]
const gouLiuqin = najiaOf('巽', '乾').map((n) => liuqinOf('金', n.wuxing))

describe('伏神', () => {
  it('天风姤缺妻财 → 本宫乾为天二爻妻财寅木伏于二爻', () => {
    const fu = fushenOf(gouLines, gouLiuqin)
    expect(fu).toHaveLength(1)
    expect(fu[0].liuqin).toBe('妻财')
    expect(fu[0].najia.zhi).toBe('寅')
    expect(fu[0].najia.wuxing).toBe('木')
    expect(fu[0].position).toBe(2)
  })
  it('伏神六亲必属本卦缺失集合', () => {
    const present = new Set(gouLiuqin)
    for (const f of fushenOf(gouLines, gouLiuqin)) {
      expect(present.has(f.liuqin)).toBe(false)
    }
  })
})
