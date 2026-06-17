import { describe, it, expect } from 'vitest'
import { forceOf } from './yong-force'

describe('forceOf（站在用神视角）', () => {
  it('源生用神=得生', () => expect(forceOf('子', '寅').force).toBe('得生')) // 水生木
  it('源克用神=受克，并叠加冲', () => {
    const r = forceOf('申', '寅') // 金克木；寅申冲
    expect(r.force).toBe('受克')
    expect(r.chong).toBe(true)
    expect(r.he).toBe(false)
  })
  it('用神生源=泄', () => expect(forceOf('午', '寅').force).toBe('泄')) // 寅木生午火
  it('用神克源=耗', () => expect(forceOf('辰', '寅').force).toBe('耗')) // 寅木克辰土
  it('同五行=比和', () => {
    const r = forceOf('申', '酉') // 皆金
    expect(r.force).toBe('比和')
    expect(r.chong).toBe(false)
    expect(r.he).toBe(false)
  })
  it('六合叠加（子丑合，用神丑被子耗）', () => {
    const r = forceOf('子', '丑')
    expect(r.he).toBe(true)
    expect(r.force).toBe('耗') // 丑土克子水 → 用神克源
  })
})
