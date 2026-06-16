import { RandomSource } from './random'
import { Hexagram } from './types'
import { castHexagram, changedHexagram, movingLineIndexes } from './casting'
import { lookupHexagram } from './hexagram-lookup'
import { HexagramData } from './hexagram-data'

export interface HexagramResult {
  lines: Hexagram
  data: HexagramData
}

export interface CastReading {
  question: string
  primary: HexagramResult
  changed: HexagramResult | null
  movingIndexes: number[]
}

export function buildReading(question: string, rng: RandomSource): CastReading {
  const primaryLines = castHexagram(rng)
  const changedLines = changedHexagram(primaryLines)
  return {
    question,
    primary: { lines: primaryLines, data: lookupHexagram(primaryLines) },
    changed: changedLines ? { lines: changedLines, data: lookupHexagram(changedLines) } : null,
    movingIndexes: movingLineIndexes(primaryLines),
  }
}
