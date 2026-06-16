import { CastReading } from './reading'
import { GanZhiPillars, pillarsOf } from './ganzhi'
import { Palace, palaceOf } from './palace'
import { najiaOf, NaJia } from './najia'
import { liuqinOf, LiuQin } from './liuqin'
import { liushenOf, LiuShen } from './liushen'
import { fushenOf, FuShen } from './fushen'

export interface PanLine {
  position: number // 1=初爻
  liushen: LiuShen
  liuqin: LiuQin
  najia: NaJia
  yinyang: 'yin' | 'yang'
  moving: boolean
  shi: boolean
  ying: boolean
  kong: boolean
  fushen?: FuShen
  changed?: { najia: NaJia; liuqin: LiuQin } // 动爻变出（地支+六亲，随本卦宫）
}

export interface Pan {
  reading: CastReading
  pillars: GanZhiPillars
  palace: Palace
  lines: PanLine[] // 初→上
}

export function buildPan(reading: CastReading, date: Date): Pan {
  const { primary, changed } = reading
  const data = primary.data
  const palace = palaceOf(data.lines)
  const pillars = pillarsOf(date)
  const najia = najiaOf(data.lower, data.upper)
  const liuqin = najia.map((n) => liuqinOf(palace.element, n.wuxing))
  const liushen = liushenOf(pillars.dayGan)
  const fushByPos = new Map(fushenOf(data.lines, liuqin).map((f) => [f.position, f]))
  const changedNajia = changed ? najiaOf(changed.data.lower, changed.data.upper) : null

  const lines: PanLine[] = primary.lines.map((line, i) => {
    const pos = i + 1
    const nj = najia[i]
    const ch =
      line.moving && changedNajia
        ? { najia: changedNajia[i], liuqin: liuqinOf(palace.element, changedNajia[i].wuxing) }
        : undefined
    return {
      position: pos,
      liushen: liushen[i],
      liuqin: liuqin[i],
      najia: nj,
      yinyang: line.yinyang,
      moving: line.moving,
      shi: pos === data.shiYao,
      ying: pos === data.yingYao,
      kong: pillars.xunKong.includes(nj.zhi),
      fushen: fushByPos.get(pos),
      changed: ch,
    }
  })

  return { reading, pillars, palace, lines }
}
