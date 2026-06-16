import { hexagrams } from '../data/hexagrams'
import { HexagramData } from './hexagram-data'
import { hexagramKey } from './hexagram-key'
import { Yinyang } from './types'

const byKey = new Map<string, HexagramData>(
  hexagrams.map((h) => [hexagramKey(h.lines.map((b) => ({ yinyang: b ? 'yang' : 'yin' }))), h]),
)

export function lookupHexagram(lines: readonly { yinyang: Yinyang }[]): HexagramData {
  const data = byKey.get(hexagramKey(lines))
  if (!data) throw new Error(`查无此卦: ${hexagramKey(lines)}`)
  return data
}
