import { WuXing } from './wuxing'
import { PALACE_HEADS, PALACE_VARIANTS } from '../data/palace-tables'

export interface Palace {
  trigram: string
  element: WuXing
  headLines: boolean[]
}

const keyOf = (lines: boolean[]) => lines.map((b) => (b ? '1' : '0')).join('')

const PALACE_MAP: Map<string, Palace> = (() => {
  const m = new Map<string, Palace>()
  for (const head of PALACE_HEADS)
    for (const v of PALACE_VARIANTS) {
      const lines = head.lines.map((b, i) => (v.flips.includes(i + 1) ? !b : b))
      m.set(keyOf(lines), { trigram: head.trigram, element: head.element, headLines: head.lines })
    }
  return m
})()

export function palaceOf(lines: boolean[]): Palace {
  const p = PALACE_MAP.get(keyOf(lines))
  if (!p) throw new Error(`palaceOf: 未命中卦 ${keyOf(lines)}`)
  return p
}
