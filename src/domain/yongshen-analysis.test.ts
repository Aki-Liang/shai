import { describe, it, expect } from 'vitest'
import { buildYongshenAnalysis, Source } from './yongshen-analysis'
import { Pan, PanLine } from './pan'

// 天风姤·乾金宫 基础盘工厂（午月/甲子日/旬空戌亥），可覆盖部分爻
function pan(overrides: Partial<PanLine>[] = [], pillarsNull = false): Pan {
  const base: PanLine[] = [
    { position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '辛', zhi: '丑', wuxing: '土' }, yinyang: 'yin', moving: false, shi: true, ying: false, kong: false },
    { position: 2, liushen: '朱雀', liuqin: '官鬼', najia: { gan: '辛', zhi: '亥', wuxing: '水' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false,
      fushen: { position: 2, liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' } } },
    { position: 3, liushen: '勾陈', liuqin: '兄弟', najia: { gan: '辛', zhi: '酉', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '父母', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 6, liushen: '玄武', liuqin: '子孙', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
  ]
  const lines = base.map((l) => ({ ...l, ...overrides.find((o) => o.position === l.position) }))
  return {
    reading: {} as Pan['reading'],
    pillars: pillarsNull ? null : { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
    palace: { trigram: '乾', element: '金', headLines: [] } as Pan['palace'],
    lines, changedLines: null,
  }
}
const kinds = (ss: Source[]) => ss.map((s) => s.kind)

describe('buildYongshenAnalysis', () => {
  it('用神取伏神（妻财）：飞神 + 卦中动爻皆作用于伏神【乙】', () => {
    const a = buildYongshenAnalysis(pan([{ position: 5, moving: true }]), '妻财')!
    expect(a.isFu).toBe(true)
    expect(a.position).toBe(2)
    expect(a.liuqin).toBe('妻财')
    expect(a.najia.zhi).toBe('寅')
    expect(a.wangshuai).toBe('休') // 寅木 in 午月
    expect(a.monthBreak).toBe(false)
    expect(kinds(a.sources)).toEqual(['月', '日', '飞', '动'])
    const fly = a.sources.find((s) => s.kind === '飞')!
    expect(fly.zhi).toBe('亥') // 飞神=二爻官鬼亥水
    expect(fly.force.force).toBe('得生') // 亥水生寅木 → 飞来生伏
    const dong = a.sources.find((s) => s.kind === '动')!
    expect(dong.position).toBe(5)
    expect(dong.force.force).toBe('受克') // 申金克寅木
    expect(dong.force.chong).toBe(true) // 寅申冲
  })

  it('显爻发动：只取用神自身变爻·回头，他爻变爻不列', () => {
    const p = pan([
      { position: 6, moving: true, changed: { najia: { gan: '癸', zhi: '卯', wuxing: '木' }, liuqin: '妻财' } },
      { position: 5, moving: true, changed: { najia: { gan: '癸', zhi: '巳', wuxing: '火' }, liuqin: '子孙' } },
    ])
    const a = buildYongshenAnalysis(p, '子孙')!
    expect(a.position).toBe(6)
    expect(a.isFu).toBe(false)
    const bian = a.sources.filter((s) => s.kind === '变')
    expect(bian).toHaveLength(1)
    expect(bian[0].position).toBe(6) // 仅用神本爻回头
    expect(bian[0].zhi).toBe('卯')
    expect(a.sources.some((s) => s.kind === '动' && s.position === 5)).toBe(true)
  })

  it('世爻为用：按持世爻定位', () => {
    const a = buildYongshenAnalysis(pan(), '世')!
    expect(a.isShi).toBe(true)
    expect(a.position).toBe(1) // 初爻持世
    expect(a.liuqin).toBe('父母')
    expect(a.najia.zhi).toBe('丑')
    expect(a.wangshuai).toBe('相') // 丑土 in 午月（火生土）
  })

  it('两现取舍：父母两现（1、4）按链取一并记录', () => {
    const a = buildYongshenAnalysis(pan(), '父母')!
    expect(a.duplicate).not.toBeNull()
    expect([1, 4]).toContain(a.position)
    expect(a.duplicate!.picked).toBe(a.position)
  })

  it('历法降级：pillars=null → 无月/日源、wangshuai=null、动变照常', () => {
    const a = buildYongshenAnalysis(pan([{ position: 6, moving: true, changed: { najia: { gan: '癸', zhi: '卯', wuxing: '木' }, liuqin: '妻财' } }], true), '子孙')!
    expect(a.wangshuai).toBeNull()
    expect(a.monthBreak).toBe(false)
    expect(kinds(a.sources)).toEqual(['变']) // 仅用神本爻回头；无月/日
  })

  it('用神无（none）返回 null', () => {
    const minimal = pan().lines.map((l) => ({ ...l, fushen: undefined }))
    const p = { ...pan(), lines: minimal }
    expect(buildYongshenAnalysis(p, '妻财')).toBeNull()
  })
})
