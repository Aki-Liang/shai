import { describe, it, expect } from 'vitest'
import { buildPan } from './pan'
import { CastReading } from './reading'
import { lookupHexagram } from './hexagram-lookup'
import { changedHexagram, movingLineIndexes } from './casting'
import { Hexagram } from './types'
import { liushenOf } from './liushen'

// 天风姤，二爻动（九二老阳→变阴 → 天山遯）
const gou: Hexagram = [
  { yinyang: 'yin', moving: false },
  { yinyang: 'yang', moving: true },
  { yinyang: 'yang', moving: false },
  { yinyang: 'yang', moving: false },
  { yinyang: 'yang', moving: false },
  { yinyang: 'yang', moving: false },
]
function gouReading(): CastReading {
  const changedLines = changedHexagram(gou)
  return {
    question: '测试',
    primary: { lines: gou, data: lookupHexagram(gou) },
    changed: changedLines ? { lines: changedLines, data: lookupHexagram(changedLines) } : null,
    movingIndexes: movingLineIndexes(gou),
  }
}

describe('buildPan', () => {
  const pan = buildPan(gouReading(), new Date('2026-06-16T12:00:00'))

  it('宫为乾、金', () => {
    expect(pan.palace.trigram).toBe('乾')
    expect(pan.palace.element).toBe('金')
  })
  it('纳甲与六亲（初→上）', () => {
    expect(pan.lines.map((l) => l.najia.zhi)).toEqual(['丑', '亥', '酉', '午', '申', '戌'])
    expect(pan.lines.map((l) => l.liuqin)).toEqual(['父母', '子孙', '兄弟', '官鬼', '兄弟', '父母'])
  })
  it('世应：世在初爻、应在四爻', () => {
    expect(pan.lines[0].shi).toBe(true)
    expect(pan.lines[3].ying).toBe(true)
  })
  it('二爻动 + 变出官鬼午火', () => {
    expect(pan.lines[1].moving).toBe(true)
    expect(pan.lines[1].changed?.liuqin).toBe('官鬼')
    expect(pan.lines[1].changed?.najia.zhi).toBe('午')
  })
  it('伏神：二爻下伏妻财寅木', () => {
    expect(pan.lines[1].fushen?.liuqin).toBe('妻财')
    expect(pan.lines[1].fushen?.najia.zhi).toBe('寅')
  })
  it('时间层接线正确：六神序与日干一致、空亡按旬空地支', () => {
    expect(pan.pillars).not.toBeNull()
    expect(pan.lines.map((l) => l.liushen)).toEqual(liushenOf(pan.pillars!.dayGan))
    for (const l of pan.lines) {
      expect(l.kong).toBe(pan.pillars!.xunKong.includes(l.najia.zhi))
    }
  })

  it('干支历失败时降级：pillars=null、六神/空亡降级、结构层不受影响、不抛', () => {
    const degraded = buildPan(gouReading(), new Date('invalid'))
    expect(degraded.pillars).toBeNull()
    expect(degraded.lines.every((l) => l.liushen === null)).toBe(true)
    expect(degraded.lines.every((l) => l.kong === false)).toBe(true)
    // 结构层（纳甲/六亲/伏神）仍正确
    expect(degraded.lines.map((l) => l.liuqin)).toEqual(['父母', '子孙', '兄弟', '官鬼', '兄弟', '父母'])
    expect(degraded.lines[1].fushen?.liuqin).toBe('妻财')
  })

  it('变卦完整盘 changedLines：天山遯（六亲随本卦宫、世二应五、无动/伏）', () => {
    expect(pan.changedLines).not.toBeNull()
    const cl = pan.changedLines!
    expect(cl).toHaveLength(6)
    expect(cl.map((l) => l.najia.zhi)).toEqual(['辰', '午', '申', '午', '申', '戌'])
    // 变卦六亲以本卦之宫（乾金）论
    expect(cl.map((l) => l.liuqin)).toEqual(['父母', '官鬼', '兄弟', '官鬼', '兄弟', '父母'])
    // 变卦自身世应：遯（乾宫二世）世二应五
    expect(cl[1].shi).toBe(true)
    expect(cl[4].ying).toBe(true)
    // 变卦盘无动爻、无伏神、无变出
    expect(cl.every((l) => l.moving === false)).toBe(true)
    expect(cl.every((l) => l.fushen === undefined)).toBe(true)
    expect(cl.every((l) => l.changed === undefined)).toBe(true)
    // 六神同位（与本卦一致，按日干）
    expect(cl.map((l) => l.liushen)).toEqual(pan.lines.map((l) => l.liushen))
  })

  it('无动爻时 changedLines 为 null', () => {
    const qianStatic: Hexagram = Array.from({ length: 6 }, () => ({
      yinyang: 'yang',
      moving: false,
    })) as Hexagram
    const staticReading: CastReading = {
      question: '静卦',
      primary: { lines: qianStatic, data: lookupHexagram(qianStatic) },
      changed: null,
      movingIndexes: [],
    }
    expect(buildPan(staticReading, new Date('2026-06-16T12:00:00')).changedLines).toBeNull()
  })
})
