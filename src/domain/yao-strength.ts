import { PanLine } from './pan'
import { NaJia } from './najia'
import { DiZhi, WuXing, zhiWuxing, generates, controls } from './wuxing'
import { chong, he } from './chonghe'
import { wangShuaiOf, WangShuai } from './wangshuai'
import { wangshuaiReasonOf } from './wangshuai-reason'

export type StrengthVerdict = '有力' | '无用'

export interface StrengthInfluence {
  kind: '月' | '日' | '动' | '空' | '回头'
  position?: number
  text: string
  helps: boolean | null
}

export interface YaoStrength {
  wangshuai: WangShuai
  wangshuaiReason: string
  kong: boolean
  monthBreak: boolean
  influences: StrengthInfluence[]
  verdict: StrengthVerdict
}

export interface YaoStrengthCtx {
  monthZhi: DiZhi
  dayZhi: DiZhi
  xunKong: [DiZhi, DiZhi]
  movingLines: PanLine[]
}

export interface YaoTarget {
  zhi: DiZhi
  wuxing: WuXing
  position: number
  moving: boolean
  changed?: { najia: NaJia }
}

/** 把某爻当「子用神」评估力量：月/日/月破/动爻/空/回头 + 有力·无用。仅在 pillars 存在时调用。 */
export function assessYaoStrength(x: YaoTarget, ctx: YaoStrengthCtx): YaoStrength {
  const { monthZhi, dayZhi, xunKong, movingLines } = ctx
  const ws = wangShuaiOf(x.wuxing, monthZhi)
  const deLing = ws === '旺' || ws === '相'
  const shiLing = ws === '休' || ws === '囚' || ws === '死'
  const kong = xunKong.includes(x.zhi)

  const dayWx = zhiWuxing(dayZhi)
  const linRi = x.zhi === dayZhi
  const linYue = x.zhi === monthZhi
  const riSheng = generates(dayWx, x.wuxing)
  const riKe = controls(dayWx, x.wuxing)
  const riChong = chong(dayZhi, x.zhi)
  const riHe = he(dayZhi, x.zhi)
  const yuePo = chong(monthZhi, x.zhi)

  const others = movingLines.filter((l) => l.position !== x.position)
  const dongSheng = others.filter((l) => generates(l.najia.wuxing, x.wuxing))
  const dongKe = others.filter((l) => controls(l.najia.wuxing, x.wuxing))

  const huiSheng = !!(x.moving && x.changed && generates(x.changed.najia.wuxing, x.wuxing))
  const huiKe = !!(x.moving && x.changed && controls(x.changed.najia.wuxing, x.wuxing))

  const fu = linRi || linYue || riSheng || riHe || ws === '相' || dongSheng.length > 0 || x.moving || huiSheng
  const beiKe = riKe || dongKe.length > 0 || huiKe
  const zhenKong = kong && shiLing && !x.moving && !riChong
  const yuePoFatal = yuePo && shiLing && !x.moving

  let verdict: StrengthVerdict
  if (zhenKong || yuePoFatal) verdict = '无用'
  else if (deLing) verdict = '有力'
  else if (shiLing && beiKe && !fu) verdict = '无用'
  else verdict = '有力'

  const influences: StrengthInfluence[] = []
  // 日
  if (linRi) influences.push({ kind: '日', text: `临日辰${dayZhi}（扶）`, helps: true })
  else if (riSheng) influences.push({ kind: '日', text: `日辰${dayZhi}${dayWx}生（扶）`, helps: true })
  else if (riHe) influences.push({ kind: '日', text: `日辰${dayZhi}合（扶）`, helps: true })
  else if (riKe) influences.push({ kind: '日', text: `日辰${dayZhi}${dayWx}克（抑）`, helps: false })
  else if (riChong) influences.push({ kind: '日', text: `日辰${dayZhi}冲（${shiLing ? '破' : '动'}）`, helps: shiLing ? false : null })
  // 月破
  if (yuePo) influences.push({ kind: '月', text: '月破', helps: false })
  // 动爻（每爻取最重：克 > 冲 > 生）
  for (const l of others) {
    if (controls(l.najia.wuxing, x.wuxing)) influences.push({ kind: '动', position: l.position, text: `${l.position}爻${l.najia.zhi}${l.najia.wuxing}克（抑）`, helps: false })
    else if (chong(l.najia.zhi, x.zhi)) influences.push({ kind: '动', position: l.position, text: `${l.position}爻${l.najia.zhi}冲`, helps: null })
    else if (generates(l.najia.wuxing, x.wuxing)) influences.push({ kind: '动', position: l.position, text: `${l.position}爻${l.najia.zhi}${l.najia.wuxing}生（扶）`, helps: true })
  }
  // 回头
  if (huiSheng) influences.push({ kind: '回头', text: '回头生（扶）', helps: true })
  else if (huiKe) influences.push({ kind: '回头', text: '回头克（抑）', helps: false })
  // 空
  if (kong) influences.push({ kind: '空', text: zhenKong ? '真空' : '假空', helps: zhenKong ? false : null })

  return { wangshuai: ws, wangshuaiReason: wangshuaiReasonOf(x.zhi, monthZhi), kong, monthBreak: yuePo, influences, verdict }
}
