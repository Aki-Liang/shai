import { describe, it, expect } from 'vitest'
import { pickYongshen, PickContext } from './yongshen-pick'
import { PanLine } from './pan'
import { DiZhi, zhiWuxing } from './wuxing'

// 最小候选爻工厂
function L(position: number, zhi: DiZhi, extra: { moving?: boolean; shi?: boolean } = {}): PanLine {
  return {
    position, liushen: null, liuqin: '兄弟',
    najia: { gan: '甲', zhi, wuxing: zhiWuxing(zhi) },
    yinyang: 'yang', moving: extra.moving ?? false,
    shi: extra.shi ?? false, ying: false, kong: false,
  }
}
const NULL_CTX: PickContext = { monthZhi: null, dayZhi: null, xunKong: null, shiPos: 3 }

describe('pickYongshen', () => {
  it('① 舍空破：去掉旬空者', () => {
    const r = pickYongshen([L(2, '亥'), L(4, '酉')], { ...NULL_CTX, xunKong: ['戌', '亥'] })
    expect(r).toEqual({ position: 4, rule: 1, ruleName: '舍空破' })
  })
  it('② 取发动：一动一静取动', () => {
    const r = pickYongshen([L(2, '子', { moving: true }), L(5, '丑')], NULL_CTX)
    expect(r).toEqual({ position: 2, rule: 2, ruleName: '取发动' })
  })
  it('③ 取旺相：午月取旺者', () => {
    const r = pickYongshen([L(2, '巳'), L(4, '未')], { ...NULL_CTX, monthZhi: '午' })
    expect(r).toEqual({ position: 2, rule: 3, ruleName: '取旺相' })
  })
  it('④ 临日月：取临日辰者', () => {
    const r = pickYongshen([L(2, '酉'), L(4, '申')], { ...NULL_CTX, monthZhi: '午', dayZhi: '酉' })
    expect(r).toEqual({ position: 2, rule: 4, ruleName: '临日月' })
  })
  it('⑤ 持世：取持世爻', () => {
    const r = pickYongshen([L(2, '卯', { shi: true }), L(5, '卯')], { ...NULL_CTX, shiPos: 2 })
    expect(r).toEqual({ position: 2, rule: 5, ruleName: '持世' })
  })
  it('⑥ 离世爻最近，等距取较上（position 较大）', () => {
    const r = pickYongshen([L(1, '卯'), L(5, '卯')], { ...NULL_CTX, shiPos: 3 })
    expect(r).toEqual({ position: 5, rule: 6, ruleName: '离世爻最近' })
  })
  it('① 全空破不误删：保持原集，落到 ⑥', () => {
    const r = pickYongshen([L(2, '子'), L(4, '丑')], { ...NULL_CTX, xunKong: ['子', '丑'], shiPos: 3 })
    expect(r.position).toBe(4) // |2-3|=|4-3|=1，取较上 4
    expect(r.rule).toBe(6)
  })
  it('历法降级：①③④ 跳过，落到 ⑥', () => {
    const r = pickYongshen([L(2, '巳'), L(4, '子')], { ...NULL_CTX, shiPos: 5 })
    expect(r.position).toBe(4) // |2-5|=3 > |4-5|=1
    expect(r.rule).toBe(6)
  })
})
