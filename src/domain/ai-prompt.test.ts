import { describe, it, expect } from 'vitest'
import { buildAiPrompt } from './ai-prompt'
import { Pan } from './pan'
import { YongshenAnalysis } from './yongshen-analysis'

const L = (position: number, liushen: string, liuqin: string, zhi: string, wuxing: string, x: Partial<any> = {}) =>
  ({ position, liushen, liuqin, najia: { gan: '甲', zhi, wuxing }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false, ...x })

const pan = {
  reading: { question: '面试能成否', primary: { data: { name: '天风姤' } }, changed: { data: { name: '天山遯' } } },
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [
    L(1, '青龙', '父母', '丑', '土', { shi: true }),
    L(2, '朱雀', '官鬼', '亥', '水', { fushen: { position: 2, liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' } } }),
    L(3, '勾陈', '兄弟', '酉', '金'),
    L(4, '螣蛇', '父母', '午', '火', { ying: true }),
    L(5, '白虎', '兄弟', '申', '金', { moving: true, changed: { najia: { gan: '壬', zhi: '未', wuxing: '土' }, liuqin: '父母' } }),
    L(6, '玄武', '子孙', '戌', '土', { kong: true }),
  ],
  changedLines: [
    L(1, '青龙', '父母', '辰', '土'), L(2, '朱雀', '兄弟', '午', '火', { shi: true }), L(3, '勾陈', '子孙', '申', '金'),
    L(4, '螣蛇', '官鬼', '午', '火'), L(5, '白虎', '兄弟', '申', '金', { ying: true }), L(6, '玄武', '妻财', '戌', '土'),
  ],
} as unknown as Pan

const analysis = {
  target: '妻财', liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' }, position: 2, isFu: true, isShi: false, duplicate: null,
  wangshuai: '休', monthBreak: false, kong: false, wangshuaiReason: '寅木生午火泄气',
  sources: [
    { kind: '日', zhi: '子', wuxing: '水', force: { force: '得生', chong: false, he: false }, role: '元神', special: '主宰' },
    { kind: '动', position: 5, zhi: '申', wuxing: '金', force: { force: '受克', chong: true, he: false }, role: '忌神',
      strength: { wangshuai: '死', wangshuaiReason: '午火克申金', kong: false, monthBreak: false, influences: [], verdict: '无用', verdictReason: '失令受克' } },
  ],
} as unknown as YongshenAnalysis

describe('buildAiPrompt', () => {
  it('含各段', () => {
    const p = buildAiPrompt(pan, analysis)
    expect(p).toMatch(/所问：面试能成否/)
    expect(p).toMatch(/丙午年 甲午月 甲子日（旬空 戌亥）/)
    expect(p).toMatch(/卦宫：乾金宫/)
    expect(p).toMatch(/本卦：天风姤　变卦：天山遯/)
    expect(p).toMatch(/上爻 玄武 子孙戌土 旬空/)
    expect(p).toMatch(/五爻 白虎 兄弟申金 ○动 →父母未土/)
    expect(p).toMatch(/变卦（上爻→初爻）/)
    expect(p).toMatch(/用神：妻财寅木（2爻·伏神） 旺衰休·寅木生午火泄气/)
    expect(p).toMatch(/元神 日辰子水 得生·主宰/)
    expect(p).toMatch(/忌神 动爻5申金 冲受克·死 无用（失令受克）/)
    expect(p).toMatch(/请按六爻（京房纳甲）规则/)
  })
  it('pillars=null → 时间降级', () => {
    expect(buildAiPrompt({ ...pan, pillars: null } as unknown as Pan, analysis)).toMatch(/时间：信息暂不可用/)
  })
  it('analysis=null → 无用神段', () => {
    expect(buildAiPrompt(pan, null)).not.toMatch(/用神：/)
  })
})
