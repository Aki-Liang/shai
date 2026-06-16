import { palaceOf } from './palace'
import { najiaOf, NaJia } from './najia'
import { liuqinOf, LiuQin } from './liuqin'

export interface FuShen {
  position: number // 1=初爻
  liuqin: LiuQin
  najia: NaJia
}

const ALL_LIUQIN: LiuQin[] = ['父母', '兄弟', '子孙', '妻财', '官鬼']

/**
 * 伏神：本卦缺失的六亲，从本宫首卦取（首卦含全五类六亲）。
 * 首卦中该六亲若现于多位，取最下一位（index 最小）作来源，挂到同一爻位。
 */
export function fushenOf(lines: boolean[], presentLiuqin: LiuQin[]): FuShen[] {
  const palace = palaceOf(lines)
  const present = new Set(presentLiuqin)
  const missing = ALL_LIUQIN.filter((lq) => !present.has(lq))
  const headNajia = najiaOf(palace.trigram, palace.trigram)
  const headLiuqin = headNajia.map((n) => liuqinOf(palace.element, n.wuxing))
  const result: FuShen[] = []
  for (const lq of missing) {
    const idx = headLiuqin.indexOf(lq) // 最下一位
    if (idx >= 0) result.push({ position: idx + 1, liuqin: lq, najia: headNajia[idx] })
  }
  return result
}
