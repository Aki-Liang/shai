import { WuXing, generates, controls } from './wuxing'

export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼'

/** 以宫五行 me 为「我」判定 other 的六亲 */
export function liuqinOf(me: WuXing, other: WuXing): LiuQin {
  if (me === other) return '兄弟'
  if (generates(other, me)) return '父母' // 生我者父母
  if (generates(me, other)) return '子孙' // 我生者子孙
  if (controls(other, me)) return '官鬼' // 克我者官鬼
  if (controls(me, other)) return '妻财' // 我克者妻财
  throw new Error(`liuqinOf: 无法判定 ${me} vs ${other}`)
}
