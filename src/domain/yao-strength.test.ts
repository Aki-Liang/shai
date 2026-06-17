import { describe, it, expect } from 'vitest'
import { assessYaoStrength, YaoStrengthCtx, YaoTarget } from './yao-strength'
import { PanLine } from './pan'
import { DiZhi, zhiWuxing } from './wuxing'

function mover(position: number, zhi: DiZhi): PanLine {
  return { position, liushen: null, liuqin: '兄弟', najia: { gan: '甲', zhi, wuxing: zhiWuxing(zhi) }, yinyang: 'yang', moving: true, shi: false, ying: false, kong: false }
}
function target(zhi: DiZhi, extra: Partial<YaoTarget> = {}): YaoTarget {
  return { zhi, wuxing: zhiWuxing(zhi), position: extra.position ?? 3, moving: extra.moving ?? false, changed: extra.changed }
}
// 午月 / 默认子日 / 旬空戌亥
const base = (over: Partial<YaoStrengthCtx> = {}): YaoStrengthCtx => ({ monthZhi: '午', dayZhi: '子', xunKong: ['戌', '亥'], movingLines: [], ...over })

describe('assessYaoStrength', () => {
  it('得令旺相 → 有力', () => {
    const r = assessYaoStrength(target('巳'), base()) // 巳火午月旺
    expect(r.wangshuai).toBe('旺')
    expect(r.verdict).toBe('有力')
  })
  it('失令但临日 → 有力（日扶）', () => {
    const r = assessYaoStrength(target('申'), base({ dayZhi: '申' })) // 申金死；临日辰申
    expect(r.verdict).toBe('有力')
    expect(r.influences.some((i) => i.kind === '日' && i.helps === true)).toBe(true)
  })
  it('失令被动爻克且无扶 → 无用', () => {
    const r = assessYaoStrength(target('申'), base({ movingLines: [mover(5, '午')] })) // 申金死；午火动克金
    expect(r.wangshuai).toBe('死')
    expect(r.verdict).toBe('无用')
    expect(r.influences.some((i) => i.kind === '动' && i.helps === false)).toBe(true)
  })
  it('真空亡（休囚+静+不被日冲）→ 无用', () => {
    const r = assessYaoStrength(target('亥'), base()) // 亥水囚；旬空；静；子不冲亥
    expect(r.kong).toBe(true)
    expect(r.verdict).toBe('无用')
    expect(r.influences.some((i) => i.kind === '空' && i.text === '真空')).toBe(true)
  })
  it('假空：旬空但发动 → 不致命（有力）', () => {
    const r = assessYaoStrength(target('亥', { moving: true }), base())
    expect(r.influences.some((i) => i.kind === '空' && i.text === '假空')).toBe(true)
    expect(r.verdict).toBe('有力')
  })
  it('月破失令且静 → 无用', () => {
    const r = assessYaoStrength(target('子'), base({ dayZhi: '寅' })) // 子水囚；午冲子月破；静
    expect(r.monthBreak).toBe(true)
    expect(r.verdict).toBe('无用')
    expect(r.influences.some((i) => i.kind === '月' && i.text === '月破')).toBe(true)
  })
})
