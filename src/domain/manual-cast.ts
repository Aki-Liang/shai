import { Line, Hexagram } from './types'
import { lineFromSum } from './lines'

export type Coin = '阴' | '阳'

/** 三钱（阴=2、阳=3）之和成爻 */
export function lineFromCoins(coins: [Coin, Coin, Coin]): Line {
  const sum = coins.reduce((s, c) => s + (c === '阳' ? 3 : 2), 0)
  return lineFromSum(sum)
}

/** 六爻各三钱 → 本卦（rows[0]=初爻，自下而上） */
export function manualHexagram(rows: ReadonlyArray<[Coin, Coin, Coin]>): Hexagram {
  if (rows.length !== 6) throw new Error(`manualHexagram: 需六爻，实得 ${rows.length}`)
  return rows.map(lineFromCoins) as Hexagram
}
