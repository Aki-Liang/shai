import { describe, it, expect } from 'vitest'
import { liushenOf } from './liushen'

describe('六神', () => {
  it('甲乙日起青龙（初→上）', () => {
    expect(liushenOf('甲')).toEqual(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'])
    expect(liushenOf('乙')).toEqual(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'])
  })
  it('庚辛日起白虎', () => {
    expect(liushenOf('庚')).toEqual(['白虎', '玄武', '青龙', '朱雀', '勾陈', '螣蛇'])
  })
  it('戊日起勾陈、己日起螣蛇、壬癸日起玄武', () => {
    expect(liushenOf('戊')[0]).toBe('勾陈')
    expect(liushenOf('己')[0]).toBe('螣蛇')
    expect(liushenOf('壬')[0]).toBe('玄武')
  })
})
