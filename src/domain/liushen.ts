export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武'

const ORDER: LiuShen[] = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
const START: Record<string, LiuShen> = {
  甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈',
  己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武',
}

/** 按日干起神，自初爻向上循环，返回 6 个（初→上） */
export function liushenOf(dayGan: string): LiuShen[] {
  const start = ORDER.indexOf(START[dayGan])
  if (start < 0) throw new Error(`liushenOf: 未知日干 ${dayGan}`)
  return Array.from({ length: 6 }, (_, i) => ORDER[(start + i) % 6])
}
