import { describe, it, expect } from 'vitest'
import { pillarsOf, xunKongOf } from './ganzhi'

describe('旬空 xunKongOf', () => {
  it('各旬空亡', () => {
    expect(xunKongOf('甲子')).toEqual(['戌', '亥'])
    expect(xunKongOf('甲戌')).toEqual(['申', '酉'])
    expect(xunKongOf('甲申')).toEqual(['午', '未'])
    expect(xunKongOf('甲午')).toEqual(['辰', '巳'])
    expect(xunKongOf('甲辰')).toEqual(['寅', '卯'])
    expect(xunKongOf('甲寅')).toEqual(['子', '丑'])
  })
  it('同旬非甲日共享空亡', () => {
    expect(xunKongOf('乙丑')).toEqual(['戌', '亥']) // 甲子旬
    expect(xunKongOf('癸酉')).toEqual(['戌', '亥']) // 甲子旬末
  })
})

describe('三柱 pillarsOf', () => {
  it('年以立春为界：2026 立春前为乙巳、后为丙午', () => {
    expect(pillarsOf(new Date('2026-01-15T12:00:00')).year).toBe('乙巳')
    expect(pillarsOf(new Date('2026-03-01T12:00:00')).year).toBe('丙午')
  })
  it('月以节为界：2026 芒种后为甲午月', () => {
    expect(pillarsOf(new Date('2026-06-16T12:00:00')).month).toBe('甲午')
  })
  it('日柱 60 日一周期，dayGan/旬空自洽', () => {
    const p1 = pillarsOf(new Date('2026-06-16T12:00:00'))
    const p2 = pillarsOf(new Date('2026-08-15T12:00:00')) // +60 天
    expect(p2.day).toBe(p1.day)
    expect(p1.dayGan).toBe(p1.day.charAt(0))
    expect(p1.xunKong).toEqual(xunKongOf(p1.day))
    expect(p1.xunKong).toHaveLength(2)
  })
})
