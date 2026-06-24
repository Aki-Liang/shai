import { describe, it, expect } from 'vitest'
import { summarize, isCastRecord, CastRecord } from './cast-record'
import { Hexagram, Line } from './types'

const line = (yinyang: 'yin' | 'yang', moving = false): Line => ({ yinyang, moving })
const allYang: Hexagram = [line('yang'), line('yang'), line('yang'), line('yang'), line('yang'), line('yang')]
// 初爻老阳(动) 其余阳 → 本卦乾为天，有一动爻 → 变卦
const oneMoving: Hexagram = [line('yang', true), line('yang'), line('yang'), line('yang'), line('yang'), line('yang')]

const rec = (lines: Hexagram): CastRecord => ({ id: 'a', createdAt: 1, question: '问', mode: 'cyber', lines })

describe('summarize', () => {
  it('无动爻：本卦名有值、变卦 null、动爻数 0', () => {
    const s = summarize(rec(allYang))
    expect(s.primaryName).toContain('乾为天')
    expect(s.changedName).toBeNull()
    expect(s.movingCount).toBe(0)
  })
  it('有动爻：变卦名非空、动爻数 1', () => {
    const s = summarize(rec(oneMoving))
    expect(s.primaryName).toContain('乾为天')
    expect(s.changedName).not.toBeNull()
    expect(s.movingCount).toBe(1)
  })
})

describe('isCastRecord', () => {
  it('合法记录 → true', () => {
    expect(isCastRecord(rec(allYang))).toBe(true)
  })
  it('缺字段 / mode 非法 / lines 长度错 / null → false', () => {
    expect(isCastRecord(null)).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 1, question: '问', mode: 'x', lines: allYang })).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 1, question: '问', mode: 'cyber', lines: allYang.slice(0, 5) })).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 'no', question: '问', mode: 'cyber', lines: allYang })).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 1, question: '问', mode: 'cyber', lines: [1, 2, 3, 4, 5, 6] })).toBe(false)
  })
})

describe('reconstruct', () => {
  it('用 lines+createdAt 重建出 reading/pan/interpretation', async () => {
    const { reconstruct } = await import('./cast-record')
    const record: CastRecord = {
      id: 'a',
      createdAt: new Date('2026-06-16T12:00:00').getTime(),
      question: '我该换工作吗？',
      mode: 'cyber',
      lines: [
        { yinyang: 'yang', moving: false }, { yinyang: 'yang', moving: false },
        { yinyang: 'yang', moving: false }, { yinyang: 'yang', moving: false },
        { yinyang: 'yang', moving: false }, { yinyang: 'yang', moving: false },
      ],
    }
    const { reading, pan, interpretation } = await reconstruct(record)
    expect(reading.question).toBe('我该换工作吗？')
    expect(interpretation.primaryName).toContain('乾为天')
    expect(pan.lines).toHaveLength(6)
    // createdAt 决定干支时间层（六月例日柱两字）
    expect(pan.pillars?.day.length).toBe(2)
  })
})
