import { DiZhi } from './wuxing'

// 六冲：子午 丑未 寅申 卯酉 辰戌 巳亥
const CHONG: Record<DiZhi, DiZhi> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
// 六合：子丑 寅亥 卯戌 辰酉 巳申 午未
const HE: Record<DiZhi, DiZhi> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}

/** a、b 是否相冲（六冲，无序；同支为假） */
export function chong(a: DiZhi, b: DiZhi): boolean {
  return CHONG[a] === b
}
/** a、b 是否相合（六合，无序；同支为假） */
export function he(a: DiZhi, b: DiZhi): boolean {
  return HE[a] === b
}
