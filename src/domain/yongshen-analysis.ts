import { Pan } from './pan'
import { NaJia } from './najia'
import { LiuQin } from './liuqin'
import { DiZhi, WuXing, zhiWuxing } from './wuxing'
import { locateYongshen } from './yongshen-locate'
import { pickYongshen } from './yongshen-pick'
import { wangShuaiOf, WangShuai } from './wangshuai'
import { forceOf, YongForce } from './yong-force'
import { chong } from './chonghe'
import { YongTarget } from './yongshen'

export type SourceKind = '月' | '日' | '飞' | '动' | '变'
export interface Source {
  kind: SourceKind
  position?: number
  zhi: DiZhi
  wuxing: WuXing
  force: YongForce
}
export interface YongshenAnalysis {
  target: YongTarget
  liuqin: LiuQin
  najia: NaJia
  position: number
  isFu: boolean
  isShi: boolean
  duplicate: { picked: number; ruleName: string } | null
  wangshuai: WangShuai | null
  monthBreak: boolean
  kong: boolean
  sources: Source[]
}

/** 干支柱末字 → 地支（"甲午"→"午"）；缺失返回 null */
function lastZhi(pillar: string | undefined): DiZhi | null {
  if (!pillar || pillar.length < 2) return null
  return pillar.charAt(1) as DiZhi
}

function src(kind: SourceKind, position: number | undefined, zhi: DiZhi, yongZhi: DiZhi): Source {
  return { kind, position, zhi, wuxing: zhiWuxing(zhi), force: forceOf(zhi, yongZhi) }
}

/** 装配用神分析：定位用神 → 旺衰/月破/旬空 → 作用源（月/日/飞/动/变）。纯函数，不抛。 */
export function buildYongshenAnalysis(pan: Pan, target: YongTarget): YongshenAnalysis | null {
  const { lines, pillars } = pan
  const monthZhi = lastZhi(pillars?.month)
  const dayZhi = lastZhi(pillars?.day)
  const xunKong = pillars ? pillars.xunKong : null
  const shiPos = lines.find((l) => l.shi)?.position ?? 0

  // 1) 定位
  let najia: NaJia
  let position: number
  let liuqin: LiuQin
  let isFu = false
  let isShi = false
  let duplicate: { picked: number; ruleName: string } | null = null

  if (target === '世') {
    const shi = lines.find((l) => l.shi)
    if (!shi) return null
    najia = shi.najia
    position = shi.position
    liuqin = shi.liuqin
    isShi = true
  } else {
    const loc = locateYongshen(lines, target)
    if (loc.kind === 'none') return null
    if (loc.kind === 'hidden') {
      const host = lines.find((l) => l.position === loc.position)!
      najia = host.fushen!.najia
      liuqin = host.fushen!.liuqin
      position = loc.position
      isFu = true
    } else if (loc.positions.length === 1) {
      const only = lines.find((l) => l.position === loc.positions[0])!
      najia = only.najia
      liuqin = only.liuqin
      position = only.position
    } else {
      const candidates = lines.filter((l) => loc.positions.includes(l.position))
      const picked = pickYongshen(candidates, { monthZhi, dayZhi, xunKong, shiPos })
      const chosen = lines.find((l) => l.position === picked.position)!
      najia = chosen.najia
      liuqin = chosen.liuqin
      position = chosen.position
      duplicate = { picked: picked.position, ruleName: picked.ruleName }
    }
  }

  const yongZhi = najia.zhi

  // 2) 旺衰 / 月破 / 旬空
  const wangshuai = monthZhi ? wangShuaiOf(najia.wuxing, monthZhi) : null
  const monthBreak = monthZhi ? chong(monthZhi, yongZhi) : false
  const kong = xunKong ? xunKong.includes(yongZhi) : false

  // 3) 作用源（顺序 月、日、飞、动、变）
  const sources: Source[] = []
  if (monthZhi) sources.push(src('月', undefined, monthZhi, yongZhi))
  if (dayZhi) sources.push(src('日', undefined, dayZhi, yongZhi))
  if (isFu) {
    const fly = lines.find((l) => l.position === position)! // 飞神=该爻显爻
    sources.push(src('飞', position, fly.najia.zhi, yongZhi))
  }
  lines
    .filter((l) => l.moving && l.position !== position) // 排除用神本爻位（显爻=自身；伏神=飞神位，已单列）
    .sort((a, b) => a.position - b.position)
    .forEach((l) => sources.push(src('动', l.position, l.najia.zhi, yongZhi)))
  if (!isFu) {
    const yongLine = lines.find((l) => l.position === position)!
    if (yongLine.moving && yongLine.changed) {
      sources.push(src('变', position, yongLine.changed.najia.zhi, yongZhi)) // 仅用神自身回头
    }
  }

  return { target, liuqin, najia, position, isFu, isShi, duplicate, wangshuai, monthBreak, kong, sources }
}
