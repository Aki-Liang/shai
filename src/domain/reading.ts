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

export function buildReadingFromHexagram(question: string, primaryLines: Hexagram): CastReading {
  const changedLines = changedHexagram(primaryLines)
  return {
    question,
    primary: { lines: primaryLines, data: lookupHexagram(primaryLines) },
    changed: changedLines ? { lines: changedLines, data: lookupHexagram(changedLines) } : null,
    movingIndexes: movingLineIndexes(primaryLines),
  }
}

export function buildReading(question: string, rng: RandomSource): CastReading {
  return buildReadingFromHexagram(question, castHexagram(rng))
}
