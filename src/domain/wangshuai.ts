import { DiZhi, WuXing, zhiWuxing, generates, controls } from './wuxing'

export type WangShuai = '旺' | '相' | '休' | '囚' | '死'

/** 旺相休囚死：只按月令。用神五行 yong 相对月令五行 M。 */
export function wangShuaiOf(yong: WuXing, monthZhi: DiZhi): WangShuai {
  const m = zhiWuxing(monthZhi)
  if (yong === m) return '旺'
  if (generates(m, yong)) return '相' // 月生用神
  if (generates(yong, m)) return '休' // 用神生月
  if (controls(yong, m)) return '囚' // 用神克月
  if (controls(m, yong)) return '死' // 月克用神
  throw new Error(`wangShuaiOf: 无法判定 ${yong} vs 月令${m}`)
}
