import { PanLine } from './pan'
import { DiZhi } from './wuxing'
import { chong } from './chonghe'
import { wangShuaiOf, WangShuai } from './wangshuai'

export interface PickContext {
  monthZhi: DiZhi | null
  dayZhi: DiZhi | null
  xunKong: [DiZhi, DiZhi] | null
  shiPos: number // 世爻位
}
export interface PickResult {
  position: number
  rule: number
  ruleName: string
}

const WS_ORDER: Record<WangShuai, number> = { 旺: 0, 相: 1, 休: 2, 囚: 3, 死: 4 }
const RULE_NAMES: Record<number, string> = {
  1: '舍空破', 2: '取发动', 3: '取旺相', 4: '临日月', 5: '持世', 6: '离世爻最近',
}

function isKongPo(l: PanLine, ctx: PickContext): boolean {
  const kong = ctx.xunKong ? ctx.xunKong.includes(l.najia.zhi) : false
  const po = ctx.monthZhi ? chong(ctx.monthZhi, l.najia.zhi) : false
  return kong || po
}
function done(l: PanLine, rule: number): PickResult {
  return { position: l.position, rule, ruleName: RULE_NAMES[rule] }
}

/** 用神两现取舍：逐条缩小候选，先满足者胜；走到 ⑥ 必出唯一。 */
export function pickYongshen(candidates: PanLine[], ctx: PickContext): PickResult {
  let pool = candidates

  // 工具：用 kept 替换 pool（仅当确实缩小且非空）；缩到 1 则定案
  const narrow = (kept: PanLine[], rule: number): PickResult | null => {
    if (kept.length >= 1 && kept.length < pool.length) {
      pool = kept
      if (pool.length === 1) return done(pool[0], rule)
    }
    return null
  }

  // ① 舍空破（全空破则不删）
  let r = narrow(pool.filter((l) => !isKongPo(l, ctx)), 1)
  if (r) return r
  // ② 取发动
  r = narrow(pool.filter((l) => l.moving), 2)
  if (r) return r
  // ③ 取旺相（降级跳过）
  if (ctx.monthZhi) {
    const m = ctx.monthZhi
    const best = Math.min(...pool.map((l) => WS_ORDER[wangShuaiOf(l.najia.wuxing, m)]))
    r = narrow(pool.filter((l) => WS_ORDER[wangShuaiOf(l.najia.wuxing, m)] === best), 3)
    if (r) return r
  }
  // ④ 临日月（降级跳过）
  if (ctx.dayZhi || ctx.monthZhi) {
    r = narrow(pool.filter((l) => l.najia.zhi === ctx.dayZhi || l.najia.zhi === ctx.monthZhi), 4)
    if (r) return r
  }
  // ⑤ 持世
  r = narrow(pool.filter((l) => l.shi), 5)
  if (r) return r
  // ⑥ 离世爻最近；等距取较上（position 较大）
  const winner = [...pool].sort((a, b) => {
    const da = Math.abs(a.position - ctx.shiPos)
    const db = Math.abs(b.position - ctx.shiPos)
    return da !== db ? da - db : b.position - a.position
  })[0]
  return done(winner, 6)
}
