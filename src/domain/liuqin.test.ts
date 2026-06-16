import { describe, it, expect } from 'vitest'
import { liuqinOf } from './liuqin'
import { najiaOf } from './najia'

describe('六亲', () => {
  it('以金宫为我的五类关系', () => {
    expect(liuqinOf('金', '金')).toBe('兄弟') // 同我
    expect(liuqinOf('金', '土')).toBe('父母') // 生我
    expect(liuqinOf('金', '水')).toBe('子孙') // 我生
    expect(liuqinOf('金', '火')).toBe('官鬼') // 克我
    expect(liuqinOf('金', '木')).toBe('妻财') // 我克
  })
  it('天风姤（金宫）六爻六亲', () => {
    const rel = najiaOf('巽', '乾').map((n) => liuqinOf('金', n.wuxing))
    expect(rel).toEqual(['父母', '子孙', '兄弟', '官鬼', '兄弟', '父母'])
  })
})
