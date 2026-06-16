import { CastReading } from './reading'
import { GanZhiPillars, pillarsOf } from './ganzhi'
import { Palace, palaceOf } from './palace'
import { najiaOf, NaJia } from './najia'
import { liuqinOf, LiuQin } from './liuqin'
import { liushenOf, LiuShen } from './liushen'
import { fushenOf, FuShen } from './fushen'

export interface PanLine {
  position: number // 1=初爻
  liushen: LiuShen | null
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
  pillars: GanZhiPillars | null
  palace: Palace
  lines: PanLine[] // 初→上
}

export function buildPan(reading: CastReading, date: Date): Pan {
  const { primary, changed } = reading
  const data = primary.data
  const palace = palaceOf(data.lines)

  // 时间层（干支三柱/六神/空亡）依赖外部历法库；失败则降级，不让整页崩（spec §8）。
  let pillars: GanZhiPillars | null = null
  try {
    pillars = pillarsOf(date)
  } catch (e) {
    console.error('[buildPan] 干支历计算失败，时间层降级：', e)
  }

  const najia = najiaOf(data.lower, data.upper)
  const liuqin = najia.map((n) => liuqinOf(palace.element, n.wuxing))
  const liushen = pillars ? liushenOf(pillars.dayGan) : null
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
      liushen: liushen ? liushen[i] : null,
      liuqin: liuqin[i],
      najia: nj,
      yinyang: line.yinyang,
      moving: line.moving,
      shi: pos === data.shiYao,
      ying: pos === data.yingYao,
      kong: pillars ? pillars.xunKong.includes(nj.zhi) : false,
      fushen: fushByPos.get(pos),
      changed: ch,
    }
  })

  return { reading, pillars, palace, lines }
}
