import { CastMode, Hexagram } from './types'
import { lookupHexagram } from './hexagram-lookup'
import { changedHexagram, movingLineIndexes } from './casting'
import { buildReadingFromHexagram, CastReading } from './reading'
import { buildPan, Pan } from './pan'
import { interpret, Interpretation } from './interpret'

export interface CastRecord {
  id: string
  createdAt: number
  question: string
  mode: CastMode
  lines: Hexagram
}

export interface CastSummary {
  primaryName: string
  changedName: string | null
  movingCount: number
}

export function summarize(record: CastRecord): CastSummary {
  const changed = changedHexagram(record.lines)
  return {
    primaryName: lookupHexagram(record.lines).name,
    changedName: changed ? lookupHexagram(changed).name : null,
    movingCount: movingLineIndexes(record.lines).length,
  }
}

export function isCastRecord(v: unknown): v is CastRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  if (typeof r.id !== 'string') return false
  if (typeof r.createdAt !== 'number' || !Number.isFinite(r.createdAt)) return false
  if (typeof r.question !== 'string') return false
  if (r.mode !== 'cyber' && r.mode !== 'manual') return false
  if (!Array.isArray(r.lines) || r.lines.length !== 6) return false
  return r.lines.every((l) => {
    if (typeof l !== 'object' || l === null) return false
    const line = l as Record<string, unknown>
    return (line.yinyang === 'yin' || line.yinyang === 'yang') && typeof line.moving === 'boolean'
  })
}

export async function reconstruct(
  record: CastRecord,
): Promise<{ reading: CastReading; pan: Pan; interpretation: Interpretation }> {
  const reading = buildReadingFromHexagram(record.question, record.lines)
  const pan = buildPan(reading, new Date(record.createdAt))
  const interpretation = await interpret(reading)
  return { reading, pan, interpretation }
}
