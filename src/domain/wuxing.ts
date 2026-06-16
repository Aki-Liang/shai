export type WuXing = '金' | '木' | '水' | '火' | '土'
export type DiZhi =
  | '子' | '丑' | '寅' | '卯' | '辰' | '巳'
  | '午' | '未' | '申' | '酉' | '戌' | '亥'

const ZHI_WUXING: Record<DiZhi, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}
export function zhiWuxing(zhi: DiZhi): WuXing {
  return ZHI_WUXING[zhi]
}

// 生：木→火→土→金→水→木
const GEN_NEXT: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
export function generates(a: WuXing, b: WuXing): boolean {
  return GEN_NEXT[a] === b
}

// 克：木→土→水→火→金→木
const CTRL_NEXT: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
export function controls(a: WuXing, b: WuXing): boolean {
  return CTRL_NEXT[a] === b
}
