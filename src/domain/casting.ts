import { RandomSource } from './random'
import { Line, Hexagram, Yinyang } from './types'
import { lineFromSum } from './lines'

/** 一枚铜钱：字=2 或 背=3，各 1/2 */
export function tossCoin(rng: RandomSource): 2 | 3 {
  return rng.nextInt(2) === 0 ? 2 : 3
}

/** 一掷 = 三枚铜钱之和（6–9） */
export function tossThrow(rng: RandomSource): number {
  return tossCoin(rng) + tossCoin(rng) + tossCoin(rng)
}

/** 摇六次，自下而上成本卦 */
export function castHexagram(rng: RandomSource): Hexagram {
  const lines: Line[] = []
  for (let i = 0; i < 6; i++) lines.push(lineFromSum(tossThrow(rng)))
  return lines as Hexagram
}

const flip = (y: Yinyang): Yinyang => (y === 'yin' ? 'yang' : 'yin')

/** 变卦：动爻翻面；无动爻返回 null */
export function changedHexagram(h: Hexagram): Hexagram | null {
  if (!h.some((l) => l.moving)) return null
  return h.map((l) => ({
    yinyang: l.moving ? flip(l.yinyang) : l.yinyang,
    moving: false,
  })) as Hexagram
}

/** 动爻下标（0=初爻） */
export function movingLineIndexes(h: Hexagram): number[] {
  return h.reduce<number[]>((acc, l, i) => (l.moving ? [...acc, i] : acc), [])
}
