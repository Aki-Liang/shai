import { describe, it, expect } from 'vitest'
import { wangShuaiOf } from './wangshuai'

// 全部以午（火）月为令验证五态
describe('wangShuaiOf（午火月）', () => {
  it('当令为旺', () => expect(wangShuaiOf('火', '午')).toBe('旺'))
  it('月生用神为相', () => expect(wangShuaiOf('土', '午')).toBe('相')) // 火生土
  it('用神生月为休', () => expect(wangShuaiOf('木', '午')).toBe('休')) // 木生火
  it('用神克月为囚', () => expect(wangShuaiOf('水', '午')).toBe('囚')) // 水克火
  it('月克用神为死', () => expect(wangShuaiOf('金', '午')).toBe('死')) // 火克金
  it('换子水月：水旺、金相', () => {
    expect(wangShuaiOf('水', '子')).toBe('旺')
    expect(wangShuaiOf('木', '子')).toBe('相') // 水生木
  })
})
